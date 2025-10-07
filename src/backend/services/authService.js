// src/backend/services/authService.js
// CommonJS Service: Discord OAuth, Guild-Mitglied prüfen, Rollen ableiten, User upserten

const fetch = global.fetch || require("node-fetch");
const users = require("../models/userModel.js");

const DISCORD_API = "https://discord.com/api";

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
const FRONTEND_URL = process.env.FRONTEND_URL || BACKEND_URL;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || `${BACKEND_URL}/api/auth/callback`;

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const ROLE_ADMIN = process.env.DISCORD_ROLE_ADMIN_ID;
const ROLE_LEAD = process.env.RAIDLEAD_ROLE_ID;
const ROLE_BOOSTER = process.env.DISCORD_ROLE_BOOSTER_ID;
const ROLE_LOOTBUDDYS = process.env.DISCORD_ROLE_LOOTBUDDYS_ID;

function getAuthorizeUrl(state = "") {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds",
    prompt: "consent",
    state,
  });
  return `${DISCORD_API}/oauth2/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`token_exchange_failed: ${res.status} ${t}`);
  }
  return res.json();
}

async function fetchDiscordUser(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`me_fetch_failed: ${res.status}`);
  return res.json();
}

async function fetchGuildMember(discordUserId) {
  if (!BOT_TOKEN || !GUILD_ID) return null;
  const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${discordUserId}`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`guild_member_failed: ${res.status}`);
  return res.json();
}

function computeRoleFlags(member) {
  const roles = Array.isArray(member?.roles) ? member.roles : [];
  const has = (id) => !!id && roles.includes(id);

  const isAdmin = has(ROLE_ADMIN);
  const isRaidlead = has(ROLE_LEAD);
  const isBooster = has(ROLE_BOOSTER);
  const isLootbuddy = has(ROLE_LOOTBUDDYS);

  const roleLevel = isAdmin ? 2 : isRaidlead ? 1 : 0;

  let highestRole = "viewer";
  if (isAdmin) highestRole = "admin";
  else if (isRaidlead) highestRole = "raidlead";
  else if (isBooster) highestRole = "booster";
  else if (isLootbuddy) highestRole = "lootbuddy";

  return {
    isOwner: false,
    isAdmin,
    isRaidlead,
    roleLevel,
    highestRole,
    rolesCsv: roles.join(","),
  };
}

async function loginWithCode(code) {
  // 1) Token tauschen
  const token = await exchangeCodeForToken(code);

  // 2) Userinfo
  const me = await fetchDiscordUser(token.access_token);

  // 3) Guild-Mitglied + Rollen prüfen (optional, empfohlen)
  const member = await fetchGuildMember(me.id);
  const flags = computeRoleFlags(member);

  // 4) User upserten
  const saved = await users.upsertFromDiscord({
    discordId: me.id,
    username: me.username || null,
    displayName: me.global_name || null,
    avatarUrl: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png` : null,
    ...flags,
  });

  // 5) Session-User (kompakt) zurückgeben
  return {
    id: saved.id,
    discordId: saved.discordId,
    username: saved.username || saved.displayName || "User",
    displayName: saved.displayName || null,
    avatarUrl: saved.avatarUrl || null,
    roleLevel: saved.roleLevel ?? 0,
    isOwner: !!saved.isOwner,
    isAdmin: !!saved.isAdmin,
    isRaidlead: !!saved.isRaidlead,
  };
}

module.exports = { getAuthorizeUrl, loginWithCode, FRONTEND_URL };

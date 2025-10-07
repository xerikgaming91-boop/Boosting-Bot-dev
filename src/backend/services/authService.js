// src/backend/services/authService.js
// Discord OAuth + Rollen/Owner-Erkennung, CommonJS

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

// Rollen (IDs aus .env)
const ROLE_ADMIN = process.env.DISCORD_ROLE_ADMIN_ID;
const ROLE_LEAD = process.env.RAIDLEAD_ROLE_ID;
const ROLE_BOOSTER = process.env.DISCORD_ROLE_BOOSTER_ID;
const ROLE_LOOTBUDDYS = process.env.DISCORD_ROLE_LOOTBUDDYS_ID;

// optionaler Fallback falls Guild-Owner-API nicht geht
const GUILD_OWNER_ID_ENV = process.env.DISCORD_GUILD_OWNER_ID;

// ---------- OAuth helpers ----------
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

async function fetchGuildOwnerId() {
  // Holt owner_id der Guild. Fallback: ENV.
  if (!BOT_TOKEN || !GUILD_ID) return GUILD_OWNER_ID_ENV || null;
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    if (!res.ok) return GUILD_OWNER_ID_ENV || null;
    const guild = await res.json();
    return guild?.owner_id || GUILD_OWNER_ID_ENV || null;
  } catch {
    return GUILD_OWNER_ID_ENV || null;
  }
}

// ---------- Role logic ----------
function computeRoleFlags(member) {
  const roles = Array.isArray(member?.roles) ? member.roles : [];
  const has = (id) => !!id && roles.includes(id);

  const isAdmin = has(ROLE_ADMIN);
  const isRaidlead = has(ROLE_LEAD);
  const isBooster = has(ROLE_BOOSTER);
  const isLootbuddy = has(ROLE_LOOTBUDDYS);

  let highestRole = "viewer";
  if (isAdmin) highestRole = "admin";
  else if (isRaidlead) highestRole = "raidlead";
  else if (isLootbuddy) highestRole = "lootbuddy";
  else if (isBooster) highestRole = "booster";

  // Basis-Level (Owner wird später auf 3 gesetzt)
  const roleLevel = isAdmin ? 2 : isRaidlead ? 1 : 0;

  return {
    isAdmin,
    isRaidlead,
    isBooster,
    isLootbuddy,
    highestRole,
    roleLevel,
    rolesCsv: roles.join(","),
  };
}

async function loginWithCode(code) {
  // 1) Token
  const token = await exchangeCodeForToken(code);
  // 2) Me
  const me = await fetchDiscordUser(token.access_token);
  // 3) Guild-Mitglied & Rollen
  const member = await fetchGuildMember(me.id);
  const baseFlags = computeRoleFlags(member);
  // 4) Owner ermitteln
  const ownerId = await fetchGuildOwnerId();
  const isOwner = !!ownerId && String(me.id) === String(ownerId);

  // 5) finale Flags zusammenführen
  const flags = {
    ...baseFlags,
    isOwner,
    // Owner hat immer höchste Stufe
    roleLevel: isOwner ? 3 : baseFlags.roleLevel,
  };

  // 6) DB upserten
  const saved = await users.upsertFromDiscord({
    discordId: me.id,
    username: me.username || null,
    displayName: me.global_name || null,
    avatarUrl: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png` : null,
    rolesCsv: flags.rolesCsv,
    highestRole: flags.highestRole,
    roleLevel: flags.roleLevel,
    isOwner: flags.isOwner,
    isAdmin: flags.isAdmin,
    isRaidlead: flags.isRaidlead,
  });

  // 7) Session-User (inkl. Lootbuddy/Booster) zurückgeben
  return {
    id: saved.id,
    discordId: saved.discordId,
    username: saved.username || saved.displayName || "User",
    displayName: saved.displayName || null,
    avatarUrl: saved.avatarUrl || null,

    roleLevel: flags.roleLevel,
    isOwner: flags.isOwner,
    isAdmin: flags.isAdmin,
    isRaidlead: flags.isRaidlead,
    isLootbuddy: flags.isLootbuddy,
    isBooster: flags.isBooster,

    highestRole: flags.highestRole,
  };
}

module.exports = { getAuthorizeUrl, loginWithCode, FRONTEND_URL };

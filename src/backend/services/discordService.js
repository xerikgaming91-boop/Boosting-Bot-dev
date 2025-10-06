// src/backend/services/discordService.js
/**
 * DiscordService
 * - Kapselt alle direkten HTTP-Calls zu Discord (OAuth & Guild API)
 * - Keine DB/Session-Logik hier! (das macht die Auth-/Role-Service-Schicht)
 *
 * Erwartete ENV:
 *   DISCORD_CLIENT_ID
 *   DISCORD_CLIENT_SECRET
 *   DISCORD_REDIRECT_URI (fällt zurück auf APP_BASE_URL + /api/auth/discord/callback)
 *   DISCORD_GUILD_ID
 *   DISCORD_BOT_TOKEN
 */

const DISCORD_API = "https://discord.com/api/v10";

const CFG = {
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  redirectUri:
    process.env.DISCORD_REDIRECT_URI ||
    `${process.env.APP_BASE_URL || "http://localhost:4000"}/api/auth/discord/callback`,
  guildId: process.env.DISCORD_GUILD_ID || null,
  botToken: process.env.DISCORD_BOT_TOKEN || null,
};

function bearer(t) {
  return `Bearer ${t}`;
}
function bot(t) {
  return `Bot ${t}`;
}

/** OAuth: Tauscht Code gegen Token */
async function exchangeCodeForToken(code) {
  if (!CFG.clientId || !CFG.clientSecret) {
    throw new Error("discord_oauth_misconfigured");
  }
  const body = new URLSearchParams();
  body.set("client_id", CFG.clientId);
  body.set("client_secret", CFG.clientSecret);
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", CFG.redirectUri);

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`discord_token_exchange_failed:${res.status}:${txt}`);
  }
  return res.json(); // { access_token, token_type, expires_in, scope, refresh_token }
}

/** /users/@me – Basis-Profil */
async function fetchUserMe(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: bearer(accessToken) },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`discord_me_failed:${res.status}:${txt}`);
  }
  return res.json(); // { id, username, global_name, avatar, ... }
}

/** /guilds/:id – Owner ermitteln (wenn kein statischer Owner gesetzt ist) */
async function fetchGuild(guildId = CFG.guildId) {
  if (!guildId || !CFG.botToken) return null;
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}`, {
    headers: { Authorization: bot(CFG.botToken) },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const txt = await res.text().catch(() => "");
    throw new Error(`discord_guild_failed:${res.status}:${txt}`);
  }
  return res.json(); // { id, owner_id, ... }
}

/** /guilds/:id/members/:userId – Rollen eines Members in der Guild holen */
async function fetchGuildMember(userId, guildId = CFG.guildId) {
  if (!guildId || !CFG.botToken) return null; // kein Guild- oder Bot-Kontext
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: bot(CFG.botToken) },
  });
  if (!res.ok) {
    if (res.status === 404) return null; // nicht in der Guild
    const txt = await res.text().catch(() => "");
    throw new Error(`discord_member_failed:${res.status}:${txt}`);
  }
  return res.json(); // { user:{id,...}, roles:[roleId,...], ... }
}

/** Baut die OAuth-Login-URL (Scope: identify) */
function buildAuthorizeUrl() {
  if (!CFG.clientId) throw new Error("discord_oauth_misconfigured");
  const u = new URL("https://discord.com/oauth2/authorize");
  u.searchParams.set("client_id", CFG.clientId);
  u.searchParams.set("redirect_uri", CFG.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "identify"); // Rollen holen wir via Bot-Token
  u.searchParams.set("prompt", "consent");
  return u.toString();
}

module.exports = {
  CFG,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchUserMe,
  fetchGuild,
  fetchGuildMember,
};

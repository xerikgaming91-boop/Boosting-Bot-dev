// src/backend/services/authService.js
/**
 * AuthService (Orchestrierung)
 * - baut die Login-URL
 * - handelt den OAuth-Callback (Token → User → Member → Rollen → Upsert → Session)
 * - liefert Session-Status & Logout
 *
 * Controller bleibt dadurch extrem dünn:
 *   const AuthService = require("../services/authService");
 *   module.exports = {
 *     discordLogin: AuthService.loginRedirect,
 *     discordCallback: AuthService.handleCallback,
 *     getSession: AuthService.getSession,
 *     logout: AuthService.logout,
 *   };
 */

const Discord = require("./discordService");
const Roles = require("./roleService");
const usersRepo = require("../models/userModel"); // Prisma-Repository (findOne/upsert/update)
const { setSessionUser } = require("../middlewares/auth");

// -------- Login: nur Redirect-URL bauen ---------------------------------
async function loginRedirect(req, res) {
  const url = Discord.buildAuthorizeUrl();
  return res.redirect(url);
}

// -------- Callback: kompletter Flow --------------------------------------
async function handleCallback(req, res) {
  try {
    const code = String(req.query.code || "");
    if (!code) return res.status(400).json({ ok: false, error: "missing_code" });

    // 1) OAuth Token + Basis-Profil
    const token = await Discord.exchangeCodeForToken(code);
    const me = await Discord.fetchUserMe(token.access_token);
    const discordId = String(me.id);

    const baseUser = {
      discordId,
      username: me.username ?? null,
      displayName: me.global_name ?? me.username ?? null,
      avatarUrl: me.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${me.avatar}.png?size=128`
        : null,
    };

    // 2) Guild-Kontext/Rollen via Bot-Token
    let rolePatch = {
      isOwner: false,
      isAdmin: false,
      isRaidlead: false,
      highestRole: null,
      roleLevel: 0,
      rolesCsv: null,
    };

    // Guild-Owner ermitteln (falls konfiguriert)
    let guildOwnerId = Roles.CFG.guildOwnerId || null;
    if (!guildOwnerId && Discord.CFG.guildId && Discord.CFG.botToken) {
      const guild = await Discord.fetchGuild().catch(() => null);
      guildOwnerId = guild?.owner_id ? String(guild.owner_id) : null;
    }

    // Member + Rollen-Flags mappen
    if (Discord.CFG.guildId && Discord.CFG.botToken) {
      const member = await Discord.fetchGuildMember(discordId).catch(() => null);
      if (member) {
        rolePatch = Roles.mapMemberToFlags({ userId: discordId, member, guildOwnerId });
      }
    }

    // 3) Upsert in DB (nur Repository spricht Prisma)
    const saved = await usersRepo.upsert({ ...baseUser, ...rolePatch });

    // 4) Session aktualisieren
    setSessionUser(req, saved);

    // 5) zurück zur App
    return res.redirect("/");
  } catch (e) {
    console.error("[authService/handleCallback] error:", e);
    return res.status(500).json({ ok: false, error: "callback_failed" });
  }
}

// -------- Session & Logout ------------------------------------------------
async function getSession(req, res) {
  const u = req.session?.user || null;
  return res.json({ ok: true, user: u || null });
}

async function logout(req, res) {
  try {
    req.session?.destroy?.(() => {});
  } catch {}
  res.json({ ok: true });
}

module.exports = {
  loginRedirect,
  handleCallback,
  getSession,
  logout,
};

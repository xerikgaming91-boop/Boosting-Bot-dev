// src/backend/controllers/usersController.js
// Users Controller – /api/users/me + /api/users/leads

const authService = require("../services/authService.js");
const usersService = require("../services/usersService.js");

/**
 * GET /api/users/me
 * - liest den eingeloggten User aus der Session
 * - refresht Rollen/Flags live via Discord (ensureFreshSession)
 * - speichert die aktualisierten Flags zurück in die Session
 */
async function getMe(req, res) {
  try {
    const cur = req?.session?.user || null;
    if (!cur) {
      return res.json({ ok: true, user: null });
    }

    const fresh = (await authService.ensureFreshSession(cur)) || cur;

    // Session aktualisieren (schreibt keine Secrets)
    req.session.user = {
      id: fresh.id || cur.id || null,
      discordId: fresh.discordId || cur.discordId || null,
      username: fresh.username || cur.username || null,
      displayName: fresh.displayName || cur.displayName || null,
      avatarUrl: fresh.avatarUrl || cur.avatarUrl || null,
      isOwner: !!fresh.isOwner,
      isAdmin: !!fresh.isAdmin,
      isRaidlead: !!fresh.isRaidlead,
      roleLevel: fresh.roleLevel ?? cur.roleLevel ?? 0,
      highestRole: fresh.highestRole || cur.highestRole || null,
    };

    return res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error("[users/getMe]", e);
    // Im Fehlerfall nicht hart failen – liefere mindestens die Session zurück
    const cur = req?.session?.user || null;
    return res.json({ ok: true, user: cur });
  }
}

/**
 * GET /api/users/leads
 * - liefert alle Raidleads (aus DB, nicht live von Discord)
 */
async function listLeads(_req, res) {
  try {
    const raw = await usersService.getLeads();
    const leads = (raw || []).map((u) => ({
      discordId: u.discordId,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
    }));
    return res.json({ ok: true, leads });
  } catch (e) {
    console.error("[users/leads]", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = { getMe, listLeads };

// src/backend/controllers/raidsController.js
/**
 * Raids Controller (MVC – dünn, Service-zentriert)
 *
 * Zugehörige Routen (typisch in routes/raidsRoutes.js):
 *   GET    /api/raids                    → list
 *   GET    /api/raids/:id               → getOne  (liefert "full" View)
 *   POST   /api/raids                   → create  (lead/admin/owner)
 *   PATCH  /api/raids/:id               → update  (lead/admin/owner)
 *   DELETE /api/raids/:id               → remove  (lead/admin/owner)
 *   POST   /api/raids/:raidId/picks/:signupId    → pick    (lead/admin/owner)
 *   DELETE /api/raids/:raidId/picks/:signupId    → unpick  (lead/admin/owner)
 *
 * Service-Funktionen (src/backend/services/raidService.js):
 *   - getAll()
 *   - getFull(id)
 *   - createRaid(payload)
 *   - updateRaid(id, patch)
 *   - deleteRaid(id)
 *   - pickSignup(raidId, signupId)
 *   - unpickSignup(raidId, signupId)
 */

const raidSvc = require("../services/raidService");

/* ----------------------------- Helpers ---------------------------------- */

function requireAuthLocal(req, res) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    return false;
  }
  return true;
}
function isLead(u) {
  return !!u && (u.isRaidlead || u.isAdmin || u.isOwner);
}
function requireLeadLocal(req, res) {
  if (!requireAuthLocal(req, res)) return false;
  if (!isLead(req.user)) {
    res.status(403).json({ ok: false, error: "FORBIDDEN", needAnyOf: ["raidlead", "admin", "owner"] });
    return false;
  }
  return true;
}

/* ------------------------------ Controller ------------------------------ */

/** GET /api/raids */
async function list(_req, res) {
  try {
    const raids = await raidSvc.getAll();
    return res.json({ ok: true, raids });
  } catch (e) {
    console.error("[raids/list] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/raids/:id  → "full" Detail */
async function getOne(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const raid = await raidSvc.getFull(id);
    if (!raid) return res.status(404).json({ ok: false, error: "RAID_NOT_FOUND" });

    return res.json({ ok: true, raid });
  } catch (e) {
    console.error("[raids/getOne] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** POST /api/raids  (lead/admin/owner) */
async function create(req, res) {
  if (!requireLeadLocal(req, res)) return;
  try {
    const body = req.body || {};

    // Minimale Eingabevalidierung
    if (!body.title || !body.date) {
      return res.status(400).json({ ok: false, error: "title_and_date_required" });
    }

    const raid = await raidSvc.createRaid({
      title: body.title,
      difficulty: body.difficulty,
      lootType: body.lootType,
      date: body.date,
      lead: body.lead ?? req.user.displayName ?? req.user.username ?? null,
      bosses: body.bosses,
      tanks: body.tanks,
      healers: body.healers,
      dps: body.dps,
      lootbuddies: body.lootbuddies,
      presetId: body.presetId ?? null,
      channelId: body.channelId ?? null,
      messageId: body.messageId ?? null,
    });

    return res.status(201).json({ ok: true, raid });
  } catch (e) {
    console.error("[raids/create] error:", e);
    return res.status(500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

/** PATCH /api/raids/:id  (lead/admin/owner) */
async function update(req, res) {
  if (!requireLeadLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const patch = { ...(req.body || {}) };
    const raid = await raidSvc.updateRaid(id, patch);
    return res.json({ ok: true, raid });
  } catch (e) {
    console.error("[raids/update] error:", e);
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "RAID_NOT_FOUND" });
    return res.status(500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

/** DELETE /api/raids/:id  (lead/admin/owner) */
async function remove(req, res) {
  if (!requireLeadLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    await raidSvc.deleteRaid(id);
    return res.json({ ok: true, raidId: id });
  } catch (e) {
    console.error("[raids/remove] error:", e);
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "RAID_NOT_FOUND" });
    return res.status(500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

/** POST /api/raids/:raidId/picks/:signupId  (lead/admin/owner) */
async function pick(req, res) {
  if (!requireLeadLocal(req, res)) return;
  try {
    const raidId = Number(req.params.raidId);
    const signupId = Number(req.params.signupId);
    if (!Number.isFinite(raidId) || !Number.isFinite(signupId)) {
      return res.status(400).json({ ok: false, error: "INVALID_PARAMS" });
    }

    const result = await raidSvc.pickSignup(raidId, signupId);
    return res.json({ ok: true, result });
  } catch (e) {
    console.error("[raids/pick] error:", e);
    // ggf. domänenspezifische Fehlercodes hier abbilden
    return res.status(500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

/** DELETE /api/raids/:raidId/picks/:signupId  (lead/admin/owner) */
async function unpick(req, res) {
  if (!requireLeadLocal(req, res)) return;
  try {
    const raidId = Number(req.params.raidId);
    const signupId = Number(req.params.signupId);
    if (!Number.isFinite(raidId) || !Number.isFinite(signupId)) {
      return res.status(400).json({ ok: false, error: "INVALID_PARAMS" });
    }

    const result = await raidSvc.unpickSignup(raidId, signupId);
    return res.json({ ok: true, result });
  } catch (e) {
    console.error("[raids/unpick] error:", e);
    return res.status(500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

module.exports = {
  list,
  getOne,
  // Alias, falls eure Routes noch "getFull" erwarten:
  getFull: getOne,
  create,
  update,
  remove,
  pick,
  unpick,
};

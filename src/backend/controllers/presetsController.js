// src/backend/controllers/presetsController.js
/**
 * Presets Controller (MVC – dünn, Model-zentriert)
 *
 * Zugehörige Routen (typisch in routes/presetsRoutes.js):
 *   GET    /api/presets            → list
 *   GET    /api/presets/:id        → getOne
 *   POST   /api/presets            → create        (lead/admin/owner)
 *   PATCH  /api/presets/:id        → update        (lead/admin/owner)
 *   DELETE /api/presets/:id        → remove        (lead/admin/owner)
 */

const presets = require("../models/presetModel");

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
function toNonNegInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
}

/* ------------------------------ Controller ------------------------------ */

/** GET /api/presets */
async function list(_req, res) {
  try {
    const rows = await presets.findMany?.() ?? [];
    return res.json({ ok: true, presets: rows });
  } catch (e) {
    console.error("[presets/list] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/presets/:id */
async function getOne(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const row = await presets.findById?.(id);
    if (!row) return res.status(404).json({ ok: false, error: "PRESET_NOT_FOUND" });

    return res.json({ ok: true, preset: row });
  } catch (e) {
    console.error("[presets/getOne] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** POST /api/presets (lead/admin/owner) */
async function create(req, res) {
  if (!requireLeadLocal(req, res)) return;
  try {
    const body = req.body || {};
    if (!body.name || typeof body.name !== "string") {
      return res.status(400).json({ ok: false, error: "name_required" });
    }

    const payload = {
      name: body.name.trim(),
      tanks: toNonNegInt(body.tanks),
      healers: toNonNegInt(body.healers),
      dps: toNonNegInt(body.dps),
      lootbuddies: toNonNegInt(body.lootbuddies),
    };

    const created = await presets.create?.(payload);
    return res.status(201).json({ ok: true, preset: created });
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ ok: false, error: "PRESET_ALREADY_EXISTS" });
    }
    console.error("[presets/create] error:", e);
    return res.status(500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

/** PATCH /api/presets/:id (lead/admin/owner) */
async function update(req, res) {
  if (!requireLeadLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const patch = { ...(req.body || {}) };
    if ("tanks" in patch) patch.tanks = toNonNegInt(patch.tanks);
    if ("healers" in patch) patch.healers = toNonNegInt(patch.healers);
    if ("dps" in patch) patch.dps = toNonNegInt(patch.dps);
    if ("lootbuddies" in patch) patch.lootbuddies = toNonNegInt(patch.lootbuddies);
    if ("name" in patch && typeof patch.name === "string") patch.name = patch.name.trim();

    const saved = await presets.update?.(id, patch);
    return res.json({ ok: true, preset: saved });
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "PRESET_NOT_FOUND" });
    if (e?.code === "P2002") return res.status(409).json({ ok: false, error: "PRESET_ALREADY_EXISTS" });
    console.error("[presets/update] error:", e);
    return res.status(500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

/** DELETE /api/presets/:id (lead/admin/owner) */
async function remove(req, res) {
  if (!requireLeadLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    await presets.remove?.(id);
    return res.json({ ok: true, presetId: id });
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "PRESET_NOT_FOUND" });
    console.error("[presets/remove] error:", e);
    return res.status(500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
};

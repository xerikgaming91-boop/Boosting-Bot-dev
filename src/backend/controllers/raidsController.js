// src/backend/controllers/raidsController.js
// Dünne Controller-Schicht – ruft nur den Service

const raidService = require("../services/raidService.js");

/** GET /api/raids (öffentlich) */
async function list(_req, res) {
  try {
    const rows = await raidService.list({ orderBy: [{ date: "desc" }] });
    return res.json({ ok: true, raids: rows });
  } catch (e) {
    console.error("[raids/list] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/raids/:id (öffentlich) */
async function getById(req, res) {
  try {
    const row = await raidService.getById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return res.json({ ok: true, raid: row });
  } catch (e) {
    console.error("[raids/getById] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** POST /api/raids (lead/admin/owner – Rollencheck via Middleware oder Frontend) */
async function create(req, res) {
  try {
    const saved = await raidService.create(req.body || {});
    return res.status(201).json({ ok: true, raid: saved });
  } catch (e) {
    const code = String(e?.message || "");
    if (code.startsWith("INVALID_")) {
      return res.status(400).json({ ok: false, error: code });
    }
    console.error("[raids/create] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** PATCH /api/raids/:id (lead/admin/owner) */
async function update(req, res) {
  try {
    const saved = await raidService.update(req.params.id, req.body || {});
    return res.json({ ok: true, raid: saved });
  } catch (e) {
    const code = String(e?.message || "");
    if (code === "NOT_FOUND") return res.status(404).json({ ok: false, error: code });
    if (code.startsWith("INVALID_")) {
      return res.status(400).json({ ok: false, error: code });
    }
    console.error("[raids/update] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** DELETE /api/raids/:id (lead/admin/owner) */
async function remove(req, res) {
  try {
    const del = await raidService.remove(req.params.id);
    return res.json({ ok: true, deleted: del });
  } catch (e) {
    console.error("[raids/remove] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  list,
  getById,   // alias für deine alte getOne-Route möglich
  create,
  update,
  remove,
};

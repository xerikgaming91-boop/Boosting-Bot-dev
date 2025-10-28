// src/backend/controllers/rosterController.js
// Thin Controller → ruft den Service und kapselt Response/Errors

const roster = require("../services/rosterPostService");

function ensureLeadOrAdmin(req) {
  const u = req?.session?.user || {};
  return !!(u.isOwner || u.isAdmin || u.isRaidlead || (u.roleLevel ?? 0) >= 2);
}

async function postRoster(req, res) {
  try {
    if (!ensureLeadOrAdmin(req)) {
      return res.status(403).json({ ok: false, error: "forbidden" });
    }
    const id = Number(req.params.id);
    const forceNew = !!req.body?.forceNew;
    const result = await roster.postRoster(id, { forceNew });
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error("[raids/postRoster]", e);
    return res.status(500).json({ ok: false, error: "server_error", detail: String(e?.message || e) });
  }
}

module.exports = {
  postRoster,
};

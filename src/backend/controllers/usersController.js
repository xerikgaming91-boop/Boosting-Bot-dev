// src/backend/controllers/usersController.js
// CommonJS-Controller – stellt me() und leads() bereit

const users = require("../models/userModel.js");

/**
 * Gibt den eingeloggten Session-User zurück.
 * Frontend ruft i. d. R. GET /api/users/me ab.
 */
async function me(req, res) {
  return res.json({
    ok: true,
    user: req.session?.user || null,
  });
}

/**
 * Liefert mögliche RaIdleads (oder Nutzer mit roleLevel >= 1)
 * Quelle: DB via userModel.findLeads()
 */
async function leads(_req, res, next) {
  try {
    const list = await users.findLeads();
    return res.json({ ok: true, leads: list });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  me,
  leads,
};

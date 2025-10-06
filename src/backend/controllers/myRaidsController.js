// src/backend/controllers/myRaidsController.js
/**
 * MyRaids Controller (MVC – dünn, Service-zentriert)
 *
 * Erwartete Routen (typisch in routes/myRaidsRoutes.js):
 *   GET /api/my-raids            → listAll (upcoming + past)
 *   GET /api/my-raids/upcoming   → listUpcoming
 *   GET /api/my-raids/past       → listPast
 *
 * Service: src/backend/services/myRaidsService.js
 *   - getForUser(discordId) => { upcoming: [...], past: [...] }
 */

const svc = require("../services/myRaidsService");

function requireAuthLocal(req, res) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    return false;
  }
  return true;
}

/** GET /api/my-raids → kombiniert upcoming & past */
async function listAll(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const data = await svc.getForUser(req.user.discordId);
    // erwartete Struktur: { upcoming: [...], past: [...] }
    return res.json({ ok: true, ...data });
  } catch (e) {
    console.error("[myRaids/listAll] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/my-raids/upcoming */
async function listUpcoming(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const { upcoming } = await svc.getForUser(req.user.discordId);
    return res.json({ ok: true, upcoming });
  } catch (e) {
    console.error("[myRaids/listUpcoming] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/my-raids/past */
async function listPast(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const { past } = await svc.getForUser(req.user.discordId);
    return res.json({ ok: true, past });
  } catch (e) {
    console.error("[myRaids/listPast] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  listAll,
  listUpcoming,
  listPast,
};

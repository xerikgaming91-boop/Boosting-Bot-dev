// src/backend/controllers/myRaidsController.js
const svc = require("../services/myRaidsService");

function requireAuthLocal(req, res) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    return false;
  }
  return true;
}

function parseOnlyPicked(q) {
  const val = String(q.onlyPicked || "").toLowerCase();
  return val === "1" || val === "true" || val === "yes";
}

/**
 * GET /api/my-raids
 * Query:
 *   - scope=upcoming|all (default: upcoming)
 *   - cycle=current|next|all (default: all)
 *   - onlyPicked=1|true (default: false)
 */
async function listAll(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const scope = req.query.scope === "all" ? "all" : "upcoming";
    const cycle = ["current", "next", "all"].includes(String(req.query.cycle)) ? String(req.query.cycle) : "all";
    const onlyPicked = parseOnlyPicked(req.query);

    const data = await svc.getForUser(req.user.discordId, { scope, cycle, onlyPicked });
    if (scope === "upcoming") {
      return res.json({ ok: true, upcoming: data.upcoming, past: { rostered: [], signups: [] } });
    }
    return res.json({ ok: true, upcoming: data.upcoming, past: data.past });
  } catch (e) {
    console.error("[myRaids/listAll] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function listUpcoming(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const cycle = ["current", "next", "all"].includes(String(req.query.cycle)) ? String(req.query.cycle) : "all";
    const onlyPicked = parseOnlyPicked(req.query);
    const { upcoming } = await svc.getForUser(req.user.discordId, { scope: "upcoming", cycle, onlyPicked });
    return res.json({ ok: true, upcoming });
  } catch (e) {
    console.error("[myRaids/listUpcoming] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function listPast(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const cycle = ["current", "next", "all"].includes(String(req.query.cycle)) ? String(req.query.cycle) : "all";
    const onlyPicked = parseOnlyPicked(req.query);
    const { past } = await svc.getForUser(req.user.discordId, { scope: "all", cycle, onlyPicked });
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

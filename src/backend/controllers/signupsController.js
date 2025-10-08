// src/backend/controllers/signupsController.js
/**
 * Signups Controller (MVCS)
 * - delegiert Business-Logik an signupService
 */

const signupSvc = require("../services/signupService");
const signups = require("../models/signupModel");
const raids = require("../models/raidModel");
const chars = require("../models/charModel");

let discordBot = null;
try { discordBot = require("../discord-bot"); } catch { discordBot = { syncRaid: async () => null }; }

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
async function ensureOwnCharOrLead(reqUser, charId) {
  if (isLead(reqUser)) return true;
  if (!charId) return true;
  const c = await chars.findById(charId);
  if (!c) return { notFound: true };
  return String(c.userId) === String(reqUser.discordId);
}

/* ------------------------------ Controller ------------------------------ */

async function listForRaid(req, res) {
  try {
    const raidId = Number(req.params.raidId);
    if (!Number.isFinite(raidId)) return res.status(400).json({ ok: false, error: "INVALID_RAID_ID" });
    const rows = await signupSvc.listByRaid(raidId);
    return res.json({ ok: true, signups: rows });
  } catch (e) {
    console.error("[signups/listForRaid] error:", e);
    return res.status(e.status || 500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

async function removeByRaidAndChar(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const raidId = Number(req.params.raidId);
    const charId = Number(req.params.charId);
    if (!Number.isFinite(raidId) || !Number.isFinite(charId)) {
      return res.status(400).json({ ok: false, error: "INVALID_IDS" });
    }

    const signup = await signups.findByRaidAndChar(raidId, charId);
    if (!signup) return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });

    const raid = await raids.findById(raidId, { withCounts: false, withPreset: false });
    if (!raid) return res.status(404).json({ ok: false, error: "RAID_NOT_FOUND" });

    const isSelf = String(signup.userId || "") === String(req.user.discordId || "");
    const isAdminOwner = !!(req.user?.isAdmin || req.user?.isOwner);
    const isLeadOfRaid = !!(req.user?.isRaidlead) && String(raid.lead || "") === String(req.user.discordId || "");
    if (!(isSelf || isAdminOwner || isLeadOfRaid)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    await signups.removeByRaidAndChar(raidId, charId);
    try { await discordBot.syncRaid(raidId); } catch {}
    return res.json({ ok: true, deleted: true });
  } catch (e) {
    console.error("[signups/removeByRaidAndChar] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function listMine(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const rows = await signups.listByUser(req.user.discordId, { withChar: true, withUser: false });
    return res.json({ ok: true, signups: rows });
  } catch (e) {
    console.error("[signups/listMine] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function getOne(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const row = await signups.findById(id, { withChar: true, withUser: true });
    if (!row) return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });

    if (!isLead(req.user) && String(row.userId || "") !== String(req.user.discordId || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    return res.json({ ok: true, signup: row });
  } catch (e) {
    console.error("[signups/getOne] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function create(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const body = req.body || {};
    const ownOk = await ensureOwnCharOrLead(req.user, body.charId);
    if (ownOk?.notFound) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!ownOk) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    // nur Pick erzwingen, wenn Lead/Admin/Owner
    const mayPick = isLead(req.user);
    const status = mayPick ? body.status : (U(body.status) === "PICKED" ? "SIGNUPED" : body.status);

    const created = await signupSvc.create(
      {
        raidId: body.raidId,
        userId: body.userId || req.user.discordId,
        type: body.type,
        charId: body.charId ?? null,
        displayName: body.displayName ?? req.user.displayName ?? req.user.username ?? null,
        saved: !!body.saved,
        note: body.note,
        class: body.class,
        status,
      },
      { actor: req.user }
    );

    return res.status(201).json({ ok: true, signup: created });
  } catch (e) {
    const status = e.status || (e.code === "CYCLE_CONFLICT" || e.code === "TIME_CONFLICT" || e.code === "RAID_CONFLICT" ? 409 : 500);
    console.error("[signups/create] error:", e);
    return res.status(status).json({ ok: false, error: e.message || "SERVER_ERROR", meta: e.meta });
  }
}

async function upsertByKey(req, res) {
  // (unverändert lassen, wenn du Upsert brauchst; Fokus hier: Pick/Unpick)
  return res.status(501).json({ ok: false, error: "NOT_IMPLEMENTED" });
}

async function update(req, res) {
  // (optional, falls du PATCH nutzt – kann bleiben wie bisher)
  return res.status(501).json({ ok: false, error: "NOT_IMPLEMENTED" });
}

async function remove(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const deleted = await signupSvc.remove(id);
    return res.json({ ok: true, result: deleted });
  } catch (e) {
    console.error("[signups/remove] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/* --------------------------- Pick / Unpick ------------------------------ */

async function pick(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    const saved = await signupSvc.pick(id, req.user);
    try { await discordBot.syncRaid(saved.raidId); } catch {}
    return res.json({ ok: true, signup: saved });
  } catch (e) {
    const status =
      e.status || (e.code === "CYCLE_CONFLICT" || e.code === "TIME_CONFLICT" || e.code === "RAID_CONFLICT" ? 409 : 500);
    console.error("[signups/pick] error:", e);
    return res.status(status).json({ ok: false, error: e.message || "SERVER_ERROR", meta: e.meta });
  }
}

async function unpick(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    const saved = await signupSvc.unpick(id, req.user);
    try { await discordBot.syncRaid(saved.raidId); } catch {}
    return res.json({ ok: true, signup: saved });
  } catch (e) {
    console.error("[signups/unpick] error:", e);
    return res.status(e.status || 500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

async function pickByRaidPath(req, res) {
  req.params.id = req.params.signupId;
  return pick(req, res);
}
async function unpickByRaidPath(req, res) {
  req.params.id = req.params.signupId;
  return unpick(req, res);
}

module.exports = {
  listForRaid,
  removeByRaidAndChar,
  listMine,
  getOne,
  create,
  upsertByKey,
  update,
  remove,
  pick,
  unpick,
  pickByRaidPath,
  unpickByRaidPath,
};

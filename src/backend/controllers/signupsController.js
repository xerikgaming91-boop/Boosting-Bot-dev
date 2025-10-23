// src/backend/controllers/signupsController.js
/**
 * Regeln:
 *  - Pro Raid: max. 1 Boost-Char (type !== 'loot') pro User
 *  - Lootbuddies (type === 'loot'): beliebig — auch zusätzlich zum Booster im *selben* Raid erlaubt
 *  - 90-Minuten-Kollision: nur zwischen *verschiedenen* Raids prüfen
 *  - Gleich-raidige Doppel-Picks (Loot+Boost oder Boost+Loot) sind erlaubt
 */

const signupSvc = require("../services/signupService");
const signups = require("../models/signupModel");
const raids = require("../models/raidModel");
const chars = require("../models/charModel");

let discordBot = null;
try { discordBot = require("../discord-bot"); } catch { discordBot = { syncRaid: async () => null }; }

/* ----------------------------- Helpers ---------------------------------- */

const U = (x) => String(x ?? "").toUpperCase();
const isLootRole = (role) => String(role || "").toLowerCase() === "loot";

function requireAuthLocal(req, res) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    return false;
  }
  return true;
}
function isLead(u) { return !!u && (u.isRaidlead || u.isAdmin || u.isOwner); }

async function ensureOwnCharOrLead(reqUser, charId) {
  if (isLead(reqUser)) return true;
  if (!charId) return true;
  const c = await chars.findById(charId);
  if (!c) return { notFound: true };
  return String(c.userId) === String(reqUser.discordId);
}

/** ±N Minuten um ein Datum als JS Date-Fenster */
function makeWindow(date, minutes = 90) {
  const t = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const ms = minutes * 60 * 1000;
  return { from: new Date(t - ms), to: new Date(t + ms) };
}

/** Defensives Datums-Parsing (ISO/UTC/ohne TZ) */
function toDateSafe(v) {
  if (v instanceof Date) return v;
  const d = new Date(v);
  if (!isNaN(d)) return d;
  const ts = Date.parse(v);
  return isNaN(ts) ? null : new Date(ts);
}

/** Kandidaten-IDs für User sammeln (Discord-ID, interne ID, etc.) */
function getUserIdCandidates(sg, req) {
  const ids = [
    sg?.userId,
    sg?.user?.id,
    sg?.user?.discordId,
    req?.user?.discordId,
    req?.user?.id,
  ]
    .map((x) => (x == null ? null : String(x)))
    .filter(Boolean);
  return Array.from(new Set(ids));
}

function isPickedRecord(x) {
  if (!x) return false;
  if (x.picked === true) return true;
  const st = U(x.status);
  return st === "PICKED" || st === "ACCEPTED" || st === "CONFIRMED";
}

/** Persistiert einen Pick robust – bevorzugt Model-Update, sonst Service */
async function persistPickDirect(id, actor) {
  const patch = {
    picked: true,
    status: "PICKED",
    pickedAt: new Date(),
    pickedById: actor?.id ?? actor?.discordId ?? null,
  };

  if (typeof signups.updateById === "function") return await signups.updateById(id, patch);
  if (typeof signups.update === "function")    return await signups.update(id, patch);
  if (typeof signups.markPicked === "function")return await signups.markPicked(id, true, actor);
  if (typeof signupSvc.pick === "function")    return await signupSvc.pick(id, actor);

  const e = new Error("No persistence method for PICK");
  e.status = 500;
  throw e;
}

async function persistUnpickDirect(id, actor) {
  const patch = { picked: false, status: "PENDING", pickedAt: null, pickedById: null };
  if (typeof signups.updateById === "function") return await signups.updateById(id, patch);
  if (typeof signups.update === "function")    return await signups.update(id, patch);
  if (typeof signups.markPicked === "function")return await signups.markPicked(id, false, actor);
  if (typeof signupSvc.unpick === "function")  return await signupSvc.unpick(id, actor);
  const e = new Error("No persistence method for UNPICK");
  e.status = 500;
  throw e;
}

/* ------------------------------ Controller ------------------------------ */

async function listForRaid(req, res) {
  try {
    const raidId = Number(req.params.raidId);
    if (!Number.isFinite(raidId))
      return res.status(400).json({ ok: false, error: "INVALID_RAID_ID" });
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
    const status =
      e.status ||
      (e.code === "CYCLE_CONFLICT" || e.code === "TIME_CONFLICT" || e.code === "RAID_CONFLICT" ? 409 : 500);
    console.error("[signups/create] error:", e);
    return res.status(status).json({ ok: false, error: e.message || "SERVER_ERROR", meta: e.meta });
  }
}

async function upsertByKey(req, res) { return res.status(501).json({ ok: false, error: "NOT_IMPLEMENTED" }); }
async function update(req, res)     { return res.status(501).json({ ok: false, error: "NOT_IMPLEMENTED" }); }

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
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const sg = await signups.findById(id, { withChar: true, withUser: true });
    if (!sg) return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });

    const raid = await raids.findById(sg.raidId, { withCounts: false, withPreset: false });
    if (!raid) return res.status(404).json({ ok: false, error: "RAID_NOT_FOUND" });

    const isLoot = isLootRole(sg.type);

    // --- Regel 1: pro Raid max. 1 Boost-Char ---
    if (!isLoot) {
      const signupsInRaid = await signupSvc.listByRaid(sg.raidId);
      const myBoostInSameRaid = (signupsInRaid || []).some(
        (x) =>
          isPickedRecord(x) &&
          String(x.userId) === String(sg.userId) &&
          String(x.id) !== String(sg.id) &&
          !isLootRole(x.type)
      );
      if (myBoostInSameRaid) {
        return res.status(409).json({
          ok: false,
          error: "User already has a picked boost character in this raid",
          code: "PICK_FORBIDDEN",
          reason: "ALREADY_BOOSTER_IN_RAID",
          meta: { raidId: sg.raidId, userId: sg.userId },
        });
      }
    }

    // --- Regel 2: 90-Minuten-Kollisionen NUR mit anderen Raids ---
    const dThis = toDateSafe(raid.date);
    const { from, to } = makeWindow(dThis, 90);

    // Kandidaten-IDs sammeln (für unterschiedliche Speicherung)
    const idCandidates = getUserIdCandidates(sg, req);

    // Für alle Kandidaten Signups laden und zusammenführen
    let otherPicked = [];
    for (const key of idCandidates) {
      try {
        const rows = await signups.listByUser(key, { withChar: false, withUser: false });
        if (Array.isArray(rows)) otherPicked.push(...rows);
      } catch { /* ignore */ }
    }

    // Filter: gepickt + anderer Raid
    otherPicked = otherPicked.filter(
      (x) => isPickedRecord(x) && Number(x.raidId) !== Number(sg.raidId)
    );

    // Deduplizieren
    const seen = new Set();
    otherPicked = otherPicked.filter((x) => {
      const k = `${x.id}|${x.raidId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Raids der anderen Picks laden und Zeitfenster checken
    for (const s of otherPicked) {
      const r = await raids.findById(s.raidId, { withCounts: false, withPreset: false });
      const d = toDateSafe(r?.date);
      if (!d) continue;
      if (d >= from && d <= to) {
        return res.status(409).json({
          ok: false,
          error: "Time collision within 90 minutes with another picked raid",
          code: "PICK_FORBIDDEN",
          reason: "TIME_CONFLICT_90",
          meta: { userId: sg.userId, raidId: sg.raidId, otherRaidId: s.raidId, at: dThis },
        });
      }
    }

    // Gleich-raidiger Doppel-Pick (Loot+Boost / Boost+Loot) ist erlaubt → direkt persistieren
    const saved = await persistPickDirect(id, req.user);

    try { await discordBot.syncRaid(saved.raidId); } catch {}
    return res.json({ ok: true, signup: saved });
  } catch (e) {
    console.error("[signups/pick] error:", e);
    const status = e.status || 500;
    return res.status(status).json({ ok: false, error: e.message || "SERVER_ERROR", meta: e.meta });
  }
}

async function unpick(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const saved = await persistUnpickDirect(id, req.user);
    try { await discordBot.syncRaid(saved.raidId); } catch {}
    return res.json({ ok: true, signup: saved });
  } catch (e) {
    console.error("[signups/unpick] error:", e);
    return res.status(e.status || 500).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

async function pickByRaidPath(req, res) { req.params.id = req.params.signupId; return pick(req, res); }
async function unpickByRaidPath(req, res) { req.params.id = req.params.signupId; return unpick(req, res); }

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

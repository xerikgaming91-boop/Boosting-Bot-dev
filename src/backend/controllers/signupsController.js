// src/backend/controllers/signupsController.js
/**
 * Signups Controller (MVC, schlanker – nutzt Service wo möglich)
 *
 * Zugehörige Routen: src/backend/routes/signupsRoutes.js
 *   GET    /api/raids/:raidId/signups      → listForRaid
 *   GET    /api/signups/my                 → listMine
 *   GET    /api/signups/:id                → getOne
 *   POST   /api/signups                    → create
 *   PUT    /api/signups/upsert             → upsertByKey
 *   PATCH  /api/signups/:id                → update
 *   DELETE /api/signups/:id                → remove
 *   DELETE /api/raids/:raidId/signups/:charId → removeByRaidAndChar
 *
 * Aktuell über Service:
 *  - create (signupService.create)
 *  - listForRaid (signupService.listByRaid)
 *  - Statuswechsel (signupService.setStatus)
 * TODO (später): upsert/update/remove ebenfalls in signupService umziehen.
 */

const signupSvc = require("../services/signupService");
const signups = require("../models/signupModel");
const raids = require("../models/raidModel");
const chars = require("../models/charModel");
const { getCycleBounds } = require("../utils/cycles");

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

/**
 * Cycle-Duplikat-Prüfung für PICKED:
 * Char darf innerhalb desselben Cycle nicht in einem anderen Raid bereits PICKED sein.
 * (Bleibt zunächst hier – später in signupService verschieben)
 */
async function assertNoPickedDuplicateInCycle({ targetRaidId, charId, excludeSignupId }) {
  if (!charId) return;
  const targetRaid = await raids.findById(targetRaidId, { withCounts: false, withPreset: false });
  if (!targetRaid || !targetRaid.date) {
    const e = new Error("RAID_NOT_FOUND");
    e.code = "VALIDATION";
    throw e;
  }
  const { start, end } = getCycleBounds(targetRaid.date);
  const { prisma } = require("../prismaClient.js");
  const existing = await prisma.signup.findFirst({
    where: {
      charId: Number(charId),
      status: "PICKED",
      raid: { date: { gte: start, lt: end } },
      ...(excludeSignupId ? { NOT: { id: Number(excludeSignupId) } } : {}),
    },
    select: { id: true, raidId: true },
  });
  if (existing && Number(existing.raidId) !== Number(targetRaidId)) {
    const err = new Error("CHAR_ALREADY_PICKED_IN_CYCLE");
    err.code = "CYCLE_CONFLICT";
    err.meta = { conflictSignupId: existing.id, conflictRaidId: existing.raidId, cycleStart: start, cycleEnd: end };
    throw err;
  }
}

/* ------------------------------ Controller ------------------------------ */

/** GET /api/raids/:raidId/signups (public read) */
async function listForRaid(req, res) {
  try {
    const raidId = Number(req.params.raidId);
    if (!Number.isFinite(raidId)) {
      return res.status(400).json({ ok: false, error: "INVALID_RAID_ID" });
    }
    // über Service
    const rows = await signupSvc.listByRaid(raidId);
    return res.json({ ok: true, signups: rows });
  } catch (e) {
    console.error("[signups/listForRaid] error:", e);
    const status = e.status || 500;
    return res.status(status).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

/** GET /api/signups/my (auth) */
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

/** GET /api/signups/:id (auth) */
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

/** POST /api/signups (auth) – via Service */
async function create(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const body = req.body || {};
    const isPicker = isLead(req.user);

    // Ownership: normale User dürfen nur eigene Chars/Signups
    const ownOk = await ensureOwnCharOrLead(req.user, body.charId);
    if (ownOk?.notFound) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!ownOk) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    // status-Härtung (nur Leads/Admin/Owner dürfen PICKED setzen)
    let status = body.status;
    if (!isPicker && String(status || "").toUpperCase() === "PICKED") {
      status = "SIGNUPED";
    }

    // Cycle-Sperre für PICKED
    if (String(status || "").toUpperCase() === "PICKED" && body.raidId) {
      await assertNoPickedDuplicateInCycle({ targetRaidId: body.raidId, charId: body.charId });
    }

    // Service-Call
    const created = await signupSvc.create({
      raidId: body.raidId,
      userId: body.userId || req.user.discordId,
      type: body.type,
      charId: body.charId ?? null,
      displayName: body.displayName ?? req.user.displayName ?? req.user.username ?? null,
      saved: !!body.saved,
      note: body.note,
      class: body.class,
      status,
    });

    return res.status(201).json({ ok: true, signup: created });
  } catch (e) {
    const status = e.status || (e.code === "CYCLE_CONFLICT" ? 409 : 500);
    console.error("[signups/create] error:", e);
    return res.status(status).json({ ok: false, error: e.message || "SERVER_ERROR", meta: e.meta });
  }
}

/** PUT /api/signups/upsert (auth) – vorerst Model, später Service */
async function upsertByKey(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const body = req.body || {};
    const isPicker = isLead(req.user);

    const ownOk = await ensureOwnCharOrLead(req.user, body.charId);
    if (ownOk?.notFound) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!ownOk) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    let desiredStatus = body.status;
    if (!isPicker && String(desiredStatus || "").toUpperCase() === "PICKED") {
      desiredStatus = "SIGNUPED";
    }
    if (String(desiredStatus || "").toUpperCase() === "PICKED" && body.charId) {
      await assertNoPickedDuplicateInCycle({ targetRaidId: body.raidId, charId: body.charId });
    }

    const saved = await signups.upsertByRaidAndChar(
      {
        raidId: body.raidId,
        charId: body.charId ?? null,
        userId: body.userId || req.user.discordId,
        type: body.type,
        displayName: body.displayName ?? req.user.displayName ?? req.user.username ?? null,
        saved: !!body.saved,
        note: body.note,
        class: body.class,
        status: desiredStatus,
      },
      { withChar: true, withUser: false }
    );

    return res.json({ ok: true, signup: saved });
  } catch (e) {
    if (e?.code === "VALIDATION") return res.status(400).json({ ok: false, error: e.message });
    if (e?.code === "CYCLE_CONFLICT") return res.status(409).json({ ok: false, error: e.message, meta: e.meta });
    if (e?.code === "P2002") return res.status(409).json({ ok: false, error: "DUPLICATE_SIGNUP" });
    console.error("[signups/upsertByKey] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** PATCH /api/signups/:id (auth) – Statuswechsel via Service, Rest via Model */
async function update(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const current = await signups.findById(id, { withChar: true, withUser: false });
    if (!current) return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });

    // Ownership
    const ownOk = await ensureOwnCharOrLead(req.user, current.charId);
    if (ownOk?.notFound) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!ownOk) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const patch = { ...(req.body || {}) };

    // Nur Leads dürfen PICKED setzen
    const wantsPicked = String(patch.status || "").toUpperCase() === "PICKED";
    if (patch.status && !isLead(req.user)) {
      delete patch.status;
    }

    // Wenn PICKED → Cycle prüfen
    const nextStatus = String(((patch.status ?? current.status) || "")).toUpperCase();
    const nextCharId = patch.charId != null ? Number(patch.charId) : current.charId;
    if (nextStatus === "PICKED" && nextCharId) {
      await assertNoPickedDuplicateInCycle({
        targetRaidId: current.raidId,
        charId: nextCharId,
        excludeSignupId: id,
      });
    }

    // Statuswechsel isoliert über Service (falls nur Status geändert wird)
    if (Object.keys(patch).length === 1 && "status" in patch) {
      const updated = await signupSvc.setStatus(id, nextStatus);
      return res.json({ ok: true, signup: { ...current, ...updated, status: nextStatus } });
    }

    // Sonst normales Update via Model
    const saved = await signups.update(id, patch, { withChar: true, withUser: false });
    return res.json({ ok: true, signup: saved });
  } catch (e) {
    if (e?.code === "CYCLE_CONFLICT") {
      return res.status(409).json({ ok: false, error: e.message, meta: e.meta });
    }
    console.error("[signups/update] error:", e);
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** DELETE /api/signups/:id (auth) */
async function remove(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const row = await signups.findById(id, { withChar: false, withUser: false });
    if (!row) return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });

    const isSelf = row.userId && String(row.userId) === String(req.user.discordId);
    if (!isSelf && !isLead(req.user)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const deleted = await signups.remove(id);
    return res.json({ ok: true, signup: deleted });
  } catch (e) {
    console.error("[signups/remove] error:", e);
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** DELETE /api/raids/:raidId/signups/:charId (auth) */
async function removeByRaidAndChar(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const raidId = Number(req.params.raidId);
    const charId = Number(req.params.charId);
    if (!Number.isFinite(raidId) || !Number.isFinite(charId)) {
      return res.status(400).json({ ok: false, error: "INVALID_PARAMS" });
    }

    const ownOk = await ensureOwnCharOrLead(req.user, charId);
    if (ownOk?.notFound) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!ownOk) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const deleted = await signups.removeByRaidAndChar(raidId, charId);
    return res.json({ ok: true, signup: deleted });
  } catch (e) {
    console.error("[signups/removeByRaidAndChar] error:", e);
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  listForRaid,
  listMine,
  getOne,
  create,
  upsertByKey,
  update,
  remove,
  removeByRaidAndChar,
};

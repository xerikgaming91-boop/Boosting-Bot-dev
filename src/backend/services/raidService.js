// src/backend/services/raidService.js
/**
 * Service-Layer für Raids
 * - verbindet Model (DB) und View (API-Ausgabe)
 * - enthält Geschäftslogik
 */

const raidModel = require("../models/raidModel.js");
const signupModel = require("../models/signupModel.js");
const raidView = require("../views/raidView.js");

exports.getAll = async () => {
  const raids = await raidModel.findAll();
  return raidView.toRaidListResponse(raids);
};

exports.getById = async (id) => {
  const raid = await raidModel.findById(id);
  return raidView.toRaidResponse(raid);
};

/**
 * Vollansicht: Basisdaten + aufgeteilte Signups
 * → Greift auf row.signups zurück, falls das Model Relationen inkludiert
 * → Fällt andernfalls auf signupModel.findByRaid(id) zurück
 * → Gibt NIE null-Arrays zurück
 */
exports.getFull = async (id) => {
  const row = await raidModel.findById(id);
  if (!row) return null;

  // Basisdaten
  const raid = raidView.toRaidResponse(row);

  // Quelle für Signups bestimmen (row.signups oder separater Fetch)
  let signupsRaw = Array.isArray(row.signups) ? row.signups : null;
  if (!signupsRaw) {
    signupsRaw = await signupModel.findByRaid(id);
  }

  const roster = [];
  const waiting = [];

  for (const s of signupsRaw) {
    const mapped = {
      id: s.id,
      userId: s.userId || s.user?.discordId || null,
      displayName: s.displayName || s.user?.displayName || s.user?.username || null,
      role: s.type, // TANK | HEAL | DPS | LOOTBUDDY
      class: s.class || s.char?.class || null,
      charId: s.charId || null,
      charName: s.char?.name || null,
      itemLevel: s.char?.itemLevel ?? null,
      wclUrl: s.char?.wclUrl || null,
      saved: !!s.saved,
      note: s.note || null,
      status: s.status, // SIGNUPED | PICKED
    };
    if (String(s.status).toUpperCase() === "PICKED") roster.push(mapped);
    else waiting.push(mapped);
  }

  return { raid, roster, signups: waiting };
};

exports.createRaid = async (data) => {
  const created = await raidModel.create(data);
  return raidView.toRaidResponse(created);
};

exports.updateRaid = async (id, data) => {
  const updated = await raidModel.update(id, data);
  return raidView.toRaidResponse(updated);
};

exports.deleteRaid = async (id) => {
  const removed = await raidModel.remove(id);
  return raidView.toRaidResponse(removed);
};

/** Booster in Roster aufnehmen */
exports.pickSignup = async (raidId, signupId) => {
  // Optional: Validierung, dass Signup wirklich zu raidId gehört
  const s = await signupModel.findById(signupId);
  if (!s || Number(s.raidId) !== Number(raidId)) {
    throw new Error("SIGNUP_NOT_IN_RAID");
  }
  const updated = await signupModel.setStatus(signupId, "PICKED");
  return {
    id: updated.id,
    raidId: updated.raidId,
    status: updated.status,
  };
};

/** Booster aus Roster entfernen (zurück in Signups) */
exports.unpickSignup = async (raidId, signupId) => {
  const s = await signupModel.findById(signupId);
  if (!s || Number(s.raidId) !== Number(raidId)) {
    throw new Error("SIGNUP_NOT_IN_RAID");
  }
  const updated = await signupModel.setStatus(signupId, "SIGNUPED");
  return {
    id: updated.id,
    raidId: updated.raidId,
    status: updated.status,
  };
};

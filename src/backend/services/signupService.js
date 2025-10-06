// src/backend/services/signupService.js
/**
 * Service-Layer für Signups
 * - Validierung & Geschäftsregeln (z. B. Char nur 1× pro Raid)
 * - Freundliche Fehler (409 statt roher Prisma-Error)
 */

const signupModel = require("../models/signupModel.js");

function assertFields(obj, fields = []) {
  const missing = fields.filter((k) => obj[k] === undefined || obj[k] === null || obj[k] === "");
  if (missing.length) {
    const err = new Error("Missing required fields: " + missing.join(", "));
    err.status = 400;
    throw err;
  }
}

/**
 * Signup erstellen
 * Erwartet mindestens: { raidId, type }
 * Optional: { userId, charId, displayName, saved, note, class }
 * Regel: wenn charId gesetzt ist → (raidId, charId) muss eindeutig sein.
 */
exports.create = async (data) => {
  assertFields(data, ["raidId", "type"]);

  const payload = {
    raidId: Number(data.raidId),
    userId: data.userId != null ? String(data.userId) : null,
    type: String(data.type).toUpperCase(), // TANK|HEAL|DPS|LOOTBUDDY
    charId: data.charId != null ? Number(data.charId) : null,
    displayName: data.displayName ?? null,
    saved: !!data.saved,
    note: data.note ?? null,
    class: data.class ?? null,
    status: data.status || "SIGNUPED",
  };

  // Vorab-Prüfung der Unique-Regel (nur wenn charId gesetzt ist)
  if (payload.charId != null) {
    const existing = await signupModel.findByRaid(payload.raidId);
    const dup = existing.find((s) => Number(s.charId) === Number(payload.charId));
    if (dup) {
      const err = new Error("Character is already signed up for this raid");
      err.status = 409;
      throw err;
    }
  }

  try {
    const created = await signupModel.create(payload);
    return {
      id: created.id,
      raidId: created.raidId,
      userId: created.userId || created.user?.discordId || null,
      displayName: created.displayName || created.user?.displayName || created.user?.username || null,
      role: created.type,
      class: created.class || created.char?.class || null,
      charId: created.charId || null,
      charName: created.char?.name || null,
      itemLevel: created.char?.itemLevel ?? null,
      wclUrl: created.char?.wclUrl || null,
      saved: !!created.saved,
      note: created.note || null,
      status: created.status,
    };
  } catch (e) {
    // Prisma P2002 = Unique-Constraint verletzt (triggert auch unsere @@unique([raidId,charId]))
    if (e?.code === "P2002") {
      const err = new Error("Character is already signed up for this raid");
      err.status = 409;
      throw err;
    }
    throw e;
  }
};

/** Signups eines Raids (roh aus Model, gemappt für API) */
exports.listByRaid = async (raidId) => {
  const rows = await signupModel.findByRaid(raidId);
  return rows.map((s) => ({
    id: s.id,
    raidId: s.raidId,
    userId: s.userId || s.user?.discordId || null,
    displayName: s.displayName || s.user?.displayName || s.user?.username || null,
    role: s.type,
    class: s.class || s.char?.class || null,
    charId: s.charId || null,
    charName: s.char?.name || null,
    itemLevel: s.char?.itemLevel ?? null,
    wclUrl: s.char?.wclUrl || null,
    saved: !!s.saved,
    note: s.note || null,
    status: s.status,
  }));
};

/** Statuswechsel (Proxy auf raidService.pick/unpick wäre auch möglich) */
exports.setStatus = async (signupId, status) => {
  const up = await signupModel.setStatus(signupId, status);
  return { id: up.id, raidId: up.raidId, status: up.status };
};

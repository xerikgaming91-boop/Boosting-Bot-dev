// src/backend/services/signupService.js
/**
 * Signups Service
 * - Wird vom HTTP-Controller und vom Discord-Bot direkt benutzt
 * - Nutzt Prisma direkt (keine Abhängigkeit von signupModel.* Namensvarianten)
 */

const { prisma } = require("../prismaClient.js");
const { getCycleBounds } = require("../utils/cycles");

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function upper(v) { return String(v || "").toUpperCase(); }

function canManageRaid(actor, raid) {
  if (!actor || !raid) return false;
  return !!(
    actor.isOwner ||
    actor.isAdmin ||
    (actor.isRaidlead && String(raid.lead || "") === String(actor.discordId || ""))
  );
}

function normalizeType(t) {
  const T = upper(t);
  if (T === "TANK" || T === "HEAL" || T === "DPS" || T === "LOOTBUDDY") return T;
  return "DPS";
}

async function assertNoPickedDuplicateInCycle({ targetRaidId, charId, excludeSignupId }) {
  if (!charId) return;
  const raid = await prisma.raid.findUnique({ where: { id: Number(targetRaidId) }, select: { id: true, date: true } });
  if (!raid || !raid.date) return; // kein strikter Block falls kein Datum

  const { start, end } = getCycleBounds(raid.date);
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

// --------------------------------------------------
// Service API
// --------------------------------------------------

/**
 * Liste aller Signups für einen Raid (inkl. Char-Basisdaten)
 */
async function listByRaid(raidId) {
  const id = Number(raidId);
  if (!Number.isFinite(id)) {
    const e = new Error("INVALID_RAID_ID");
    e.status = 400;
    throw e;
  }
  const signups = await prisma.signup.findMany({
    where: { raidId: id },
    include: { char: { select: { id: true, name: true, realm: true, class: true, spec: true } } },
    orderBy: [{ saved: "desc" }, { createdAt: "asc" }],
  });
  return signups;
}

/**
 * Signup erstellen (normal oder Lootbuddy)
 * payload: {
 *   raidId, userId, type, charId?, displayName?, saved?, note?, class?, status?
 * }
 * options: { actor?: {discordId,isAdmin,isOwner,isRaidlead} }
 */
async function create(payload, options = {}) {
  const actor = options.actor || null;

  const raidId = Number(payload.raidId);
  if (!Number.isFinite(raidId)) {
    const e = new Error("INVALID_RAID_ID");
    e.status = 400;
    throw e;
  }

  const raid = await prisma.raid.findUnique({ where: { id: raidId }, select: { id: true, lead: true, date: true } });
  if (!raid) {
    const e = new Error("RAID_NOT_FOUND");
    e.status = 404;
    throw e;
  }

  const type = normalizeType(payload.type);
  const isLootbuddy = type === "LOOTBUDDY";

  let char = null;
  let charId = payload.charId != null ? Number(payload.charId) : null;

  if (!isLootbuddy) {
    if (!Number.isFinite(charId)) {
      const e = new Error("MISSING_CHAR_ID");
      e.status = 400;
      throw e;
    }
    char = await prisma.boosterChar.findUnique({
      where: { id: charId },
      select: { id: true, userId: true, class: true },
    });
    if (!char) {
      const e = new Error("CHAR_NOT_FOUND");
      e.status = 404;
      throw e;
    }
    // Ownership (nur wenn actor vorhanden und nicht Lead/Admin/Owner)
    if (actor && !(actor.isOwner || actor.isAdmin || actor.isRaidlead)) {
      if (String(char.userId) !== String(actor.discordId || "")) {
        const e = new Error("FOREIGN_CHAR");
        e.status = 403;
        throw e;
      }
    }
  } else {
    // Lootbuddy: charId MUSS null sein
    charId = null;
  }

  // Berechtigung für saved/PICKED
  const mayManage = canManageRaid(actor, raid);

  // saved nur, wenn actor darf
  const saved = !!(payload.saved && mayManage);

  // status default
  let status = upper(payload.status || "SIGNUPED");
  if (status === "PICKED" && !mayManage) status = "SIGNUPED";

  // Cycle-Check nur wenn PICKED (und char vorhanden)
  if (status === "PICKED" && charId) {
    await assertNoPickedDuplicateInCycle({ targetRaidId: raidId, charId });
  }

  // displayName fallback
  const displayName =
    payload.displayName ||
    (actor ? actor.displayName || actor.username : null) ||
    String(payload.userId || "");

  // Für normale Signups: class vom Char übernehmen
  const klass = isLootbuddy ? (payload.class || null) : (char?.class || null);

  try {
    const created = await prisma.signup.create({
      data: {
        raidId,
        userId: String(payload.userId || ""),
        type,
        charId,                         // null bei Lootbuddy → erlaubt
        displayName,
        saved,
        note: payload.note || null,
        class: klass,
        status,
      },
      include: { char: { select: { id: true, name: true, realm: true, class: true, spec: true } } },
    });
    return created;
  } catch (e) {
    // Unique (raidId,charId)
    if (e?.code === "P2002") {
      const err = new Error("DUPLICATE_SIGNUP");
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

/**
 * Signup löschen (optional mit actor-Check)
 */
async function remove(id, options = {}) {
  const actor = options.actor || null;
  const signupId = Number(id);
  if (!Number.isFinite(signupId)) {
    const e = new Error("INVALID_ID");
    e.status = 400;
    throw e;
  }

  const s = await prisma.signup.findUnique({
    where: { id: signupId },
    select: { id: true, userId: true, raidId: true, charId: true },
  });
  if (!s) {
    const e = new Error("SIGNUP_NOT_FOUND");
    e.status = 404;
    throw e;
  }

  if (actor && !(actor.isOwner || actor.isAdmin)) {
    // Owner des Signups oder Lead des Raids
    const raid = await prisma.raid.findUnique({ where: { id: s.raidId }, select: { id: true, lead: true } });
    const isOwnerOfSignup = String(s.userId || "") === String(actor.discordId || "");
    const isLeadOfRaid = !!(actor.isRaidlead) && String(raid?.lead || "") === String(actor.discordId || "");
    if (!(isOwnerOfSignup || isLeadOfRaid)) {
      const e = new Error("FORBIDDEN");
      e.status = 403;
      throw e;
    }
  }

  await prisma.signup.delete({ where: { id: s.id } });
  return { deleted: true };
}

module.exports = {
  listByRaid,
  create,
  remove,
};

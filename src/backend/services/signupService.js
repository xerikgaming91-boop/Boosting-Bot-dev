// src/backend/services/signupService.js
/**
 * Signups Service – Business-Logik (MVCS)
 */

const { prisma } = require("../prismaClient.js");
const { getCycleWindowFor } = require("../utils/cyclesWindow.js"); // Mi 08:00 → Mi 07:00

/* ------------------------------ Helpers -------------------------------- */

const U = (v) => String(v || "").toUpperCase();

function normalizeType(t) {
  const T = U(t);
  return ["TANK", "HEAL", "DPS", "LOOTBUDDY"].includes(T) ? T : "DPS";
}

function canManageRaid(actor, raid) {
  if (!actor || !raid) return false;
  return !!(
    actor.isOwner ||
    actor.isAdmin ||
    (actor.isRaidlead && String(raid.lead || "") === String(actor.discordId || ""))
  );
}

/** Char im selben Cycle & in derselben Difficulty schon PICKED? → blocken */
async function assertNoPickedDuplicateInCycleSameDiff({ targetRaid, charId, excludeSignupId }) {
  if (!charId || !targetRaid?.date) return;
  const { start, end } = getCycleWindowFor(new Date(targetRaid.date));
  const targetDiff = U(targetRaid.difficulty || "");

  const clash = await prisma.signup.findFirst({
    where: {
      charId: Number(charId),
      status: "PICKED",
      raid: {
        date: { gte: start, lt: end },
        difficulty: targetDiff,
      },
      ...(excludeSignupId ? { NOT: { id: Number(excludeSignupId) } } : {}),
    },
    select: { id: true, raidId: true },
  });

  if (clash && Number(clash.raidId) !== Number(targetRaid.id)) {
    const err = new Error("CHAR_ALREADY_PICKED_IN_CYCLE_SAME_DIFFICULTY");
    err.code = "CYCLE_CONFLICT";
    err.meta = { conflictSignupId: clash.id, conflictRaidId: clash.raidId, cycleStart: start, cycleEnd: end, difficulty: targetDiff };
    throw err;
  }
}

/** Pro Raid: nur 1 Booster-Char (charId != null) pro User erlaubt */
async function assertOneBoosterPerRaidPerUser({ raidId, userId, excludeSignupId }) {
  const exists = await prisma.signup.findFirst({
    where: {
      raidId: Number(raidId),
      userId: String(userId || ""),
      status: "PICKED",
      NOT: { id: Number(excludeSignupId || 0) },
      // Booster-Char: charId != null (Lootbuddys haben charId == null)
      NOT: { charId: null },
    },
    select: { id: true },
  });
  if (exists) {
    const err = new Error("USER_ALREADY_HAS_BOOSTCHAR_IN_RAID");
    err.code = "RAID_CONFLICT";
    throw err;
  }
}

/**
 * 90-Minuten-Konflikt (±90min):
 * - Standard: blocken, wenn der User im Fenster bereits PICKED ist (Lootbuddy oder Booster).
 * - EINZIGE AUSNAHME: Wenn ALLE gefundenen Konflikte im GLEICHEN RAID sind
 *   UND der neue Pick ein LOOTBUDDY ist
 *   UND mindestens einer der gefundenen Konflikte ein BOOSTER (charId != null) ist.
 *   → Dann erlauben (Booster + zusätzlicher Lootbuddy im selben Raid).
 * - Gibt es auch nur EINEN Konflikt in einem ANDEREN Raid → blocken.
 */
async function assertNoTimeConflict90minSameRaidException({ targetRaid, userId, pickingIsLootbuddy, excludeSignupId }) {
  if (!targetRaid?.date || !userId) return;
  const center = new Date(targetRaid.date).getTime();
  const start = new Date(center - 90 * 60 * 1000);
  const end = new Date(center + 90 * 60 * 1000);

  const conflicts = await prisma.signup.findMany({
    where: {
      userId: String(userId),
      status: "PICKED",
      raid: { date: { gte: start, lte: end } },
      ...(excludeSignupId ? { NOT: { id: Number(excludeSignupId) } } : {}),
    },
    select: { id: true, raidId: true, charId: true },
  });

  if (!conflicts.length) return;

  // Wenn irgendein Konflikt in einem anderen Raid liegt → blocken
  if (conflicts.some((c) => Number(c.raidId) !== Number(targetRaid.id))) {
    const err = new Error("TIME_CONFLICT_90_MIN");
    err.code = "TIME_CONFLICT";
    err.meta = { windowStart: start, windowEnd: end };
    throw err;
  }

  // Alle Konflikte sind im selben Raid → nur erlauben, wenn neuer Pick Lootbuddy ist UND es mind. einen Booster-Konflikt gibt
  if (pickingIsLootbuddy && conflicts.some((c) => c.charId != null)) {
    return; // Ausnahme greift
  }

  const err = new Error("TIME_CONFLICT_90_MIN_SAME_RAID");
  err.code = "TIME_CONFLICT";
  err.meta = { windowStart: start, windowEnd: end };
  throw err;
}

/** Nach PICK: alle anderen SIGNUPED-Anmeldungen desselben Chars im Cycle entfernen */
async function cleanupOtherSignupsForCharInCycle({ charId, keepRaidId, anchorDate }) {
  if (!charId) return { count: 0 };
  const { start, end } = getCycleWindowFor(new Date(anchorDate || Date.now()));
  return prisma.signup.deleteMany({
    where: {
      charId: Number(charId),
      status: "SIGNUPED",
      raidId: { not: Number(keepRaidId) },
      raid: { date: { gte: start, lt: end } },
    },
  });
}

/* ------------------------------ Service API ---------------------------- */

/** Liste für Raid */
async function listByRaid(raidId) {
  const id = Number(raidId);
  if (!Number.isFinite(id)) {
    const e = new Error("INVALID_RAID_ID");
    e.status = 400;
    throw e;
  }
  return prisma.signup.findMany({
    where: { raidId: id },
    include: { char: { select: { id: true, name: true, realm: true, class: true, spec: true } } },
    orderBy: [{ saved: "desc" }, { createdAt: "asc" }],
  });
}

/** Signup erstellen (PICKED nur wenn berechtigt; Checks je nach Typ) */
async function create(payload, options = {}) {
  const actor = options.actor || null;

  const raid = await prisma.raid.findUnique({
    where: { id: Number(payload.raidId) },
    select: { id: true, lead: true, date: true, difficulty: true },
  });
  if (!raid) {
    const e = new Error("RAID_NOT_FOUND");
    e.status = 404;
    throw e;
  }

  const type = normalizeType(payload.type);
  const isLootbuddy = type === "LOOTBUDDY";
  const charId = payload.charId == null ? null : Number(payload.charId);

  if (!isLootbuddy && !Number.isFinite(charId)) {
    const e = new Error("MISSING_CHAR_ID");
    e.status = 400;
    throw e;
  }

  const mayManage = canManageRaid(actor, raid);
  let status = U(payload.status || "SIGNUPED");
  if (status === "PICKED" && !mayManage) status = "SIGNUPED";

  // Direkt-Pick nur bei Berechtigung → Checks:
  if (status === "PICKED") {
    if (!isLootbuddy && charId) {
      await assertNoPickedDuplicateInCycleSameDiff({ targetRaid: raid, charId });
      await assertOneBoosterPerRaidPerUser({ raidId: raid.id, userId: payload.userId, excludeSignupId: null });
    }
    await assertNoTimeConflict90minSameRaidException({
      targetRaid: raid,
      userId: payload.userId,
      pickingIsLootbuddy: isLootbuddy,
      excludeSignupId: null,
    });
  }

  const created = await prisma.signup.create({
    data: {
      raidId: raid.id,
      userId: String(payload.userId || ""),
      type,
      charId: isLootbuddy ? null : charId,
      displayName: payload.displayName ?? null,
      saved: !!payload.saved,
      note: payload.note || null,
      class: isLootbuddy ? (payload.class || null) : null,
      status,
    },
    include: { char: { select: { id: true, name: true, realm: true, class: true, spec: true } } },
  });

  return created;
}

/** Signup löschen */
async function remove(id) {
  const signupId = Number(id);
  if (!Number.isFinite(signupId)) {
    const e = new Error("INVALID_ID");
    e.status = 400;
    throw e;
  }
  await prisma.signup.delete({ where: { id: signupId } });
  return { deleted: true };
}

/** PICK – inkl. Cycle/Diff, 90min (mit Ausnahme „gleicher Raid“), Cleanup bei Booster-Char */
async function pick(signupId, actor) {
  const id = Number(signupId);
  if (!Number.isFinite(id)) {
    const e = new Error("INVALID_ID");
    e.status = 400;
    throw e;
  }

  const s = await prisma.signup.findUnique({
    where: { id },
    include: {
      raid: { select: { id: true, lead: true, date: true, difficulty: true } },
    },
  });
  if (!s) {
    const e = new Error("SIGNUP_NOT_FOUND");
    e.status = 404;
    throw e;
  }
  if (!canManageRaid(actor, s.raid)) {
    const e = new Error("FORBIDDEN");
    e.status = 403;
    throw e;
  }

  const isLootbuddy = s.charId == null;

  // Booster-Char-spezifische Checks
  if (!isLootbuddy) {
    await assertNoPickedDuplicateInCycleSameDiff({ targetRaid: s.raid, charId: s.charId, excludeSignupId: id });
    await assertOneBoosterPerRaidPerUser({ raidId: s.raidId, userId: s.userId, excludeSignupId: id });
  }

  // 90-Minuten-Regel mit Ausnahme NUR im selben Raid (Booster vorhanden + neuer Pick = Lootbuddy)
  await assertNoTimeConflict90minSameRaidException({
    targetRaid: s.raid,
    userId: s.userId,
    pickingIsLootbuddy: isLootbuddy,
    excludeSignupId: id,
  });

  // Status setzen
  if (s.status !== "PICKED") {
    await prisma.signup.update({ where: { id }, data: { status: "PICKED", saved: true } });
  }

  // Cleanup andere Signups (selber Char) im Cycle – nur Booster-Char relevant
  if (!isLootbuddy) {
    await cleanupOtherSignupsForCharInCycle({
      charId: s.charId,
      keepRaidId: s.raidId,
      anchorDate: s.raid?.date,
    });
  }

  return prisma.signup.findUnique({
    where: { id },
    include: { char: { select: { id: true, name: true, realm: true, class: true, spec: true } } },
  });
}

/** UNPICK – zurück auf SIGNUPED */
async function unpick(signupId, actor) {
  const id = Number(signupId);
  if (!Number.isFinite(id)) {
    const e = new Error("INVALID_ID");
    e.status = 400;
    throw e;
  }

  const s = await prisma.signup.findUnique({
    where: { id },
    include: { raid: { select: { id: true, lead: true } } },
  });
  if (!s) {
    const e = new Error("SIGNUP_NOT_FOUND");
    e.status = 404;
    throw e;
  }
  if (!canManageRaid(actor, s.raid)) {
    const e = new Error("FORBIDDEN");
    e.status = 403;
    throw e;
  }

  return prisma.signup.update({
    where: { id },
    data: { status: "SIGNUPED", saved: false },
    include: { char: { select: { id: true, name: true, realm: true, class: true, spec: true } } },
  });
}

module.exports = {
  listByRaid,
  create,
  remove,
  pick,
  unpick,
};

// src/backend/services/pickRules.js
// Zentrale Prüf-Logik für das Picken von Signups (Prisma + Node)

const { DateTime } = require("luxon");

/** Rolle "loot" ist KEIN Boost-Char, alles andere ist Boost */
function isLootRole(role) {
  return String(role || "").toLowerCase() === "loot";
}

/**
 * Prüft: Hat der User in DIESEM Raid bereits einen gepickten Boost-Char?
 * (Lootbuddies sind erlaubt und zählen hier nicht.)
 */
async function hasBoostCharAlreadyPickedInRaid(prisma, { raidId, userId, excludeSignupId }) {
  const hits = await prisma.signup.findMany({
    where: {
      raidId,
      userId,
      picked: true,
      NOT: { id: excludeSignupId ?? -1 },
      // alles außer loot
      NOT: { type: "loot" },
    },
    select: { id: true },
  });
  return hits.length > 0;
}

/**
 * Prüft 90-Minuten-Kollisionen mit ANDEREN Raids.
 * Wenn der User bereits in einem anderen Raid (egal ob loot/boost) gepickt ist,
 * und die Startzeiten < 90 Minuten auseinanderliegen → blockieren.
 */
async function hasTimeCollisionWithin(prisma, { userId, raidId, raidDate, minutes = 90 }) {
  if (!raidDate) return false;

  const dt = DateTime.fromJSDate(raidDate);
  const from = dt.minus({ minutes }).toJSDate();
  const to = dt.plus({ minutes }).toJSDate();

  const hits = await prisma.signup.findMany({
    where: {
      userId,
      picked: true,
      // andere Raids
      NOT: { raidId },
      // Raid.start innerhalb [from, to]
      raid: {
        date: { gte: from, lte: to },
      },
    },
    select: { id: true, raidId: true },
  });

  return hits.length > 0;
}

/**
 * Haupt-Guard: Wirft eine strukturierte Fehlermeldung, falls Regeln verletzt werden.
 * Rückgabe: nix (erfolgreich) – oder Error mit code='PICK_FORBIDDEN'
 */
async function assertCanPickSignup(prisma, { signupId }) {
  const signup = await prisma.signup.findUnique({
    where: { id: Number(signupId) },
    include: {
      raid: { select: { id: true, date: true, title: true } },
      user: { select: { id: true, discordId: true, name: true } },
    },
  });

  if (!signup) {
    const err = new Error("Signup not found");
    err.status = 404;
    throw err;
  }

  if (signup.picked) {
    const err = new Error("Signup already picked");
    err.status = 409;
    err.code = "PICK_FORBIDDEN";
    err.reason = "ALREADY_PICKED";
    err.meta = { signupId };
    throw err;
  }

  const { raidId } = signup;
  const userId = signup.userId || signup.user?.id;
  const isLoot = isLootRole(signup.type);

  // Regel 1: Pro Raid nur EIN Boost-Char
  if (!isLoot) {
    const hasBoostAlready = await hasBoostCharAlreadyPickedInRaid(prisma, {
      raidId,
      userId,
      excludeSignupId: signup.id,
    });
    if (hasBoostAlready) {
      const err = new Error("User already has a picked boost character in this raid");
      err.status = 409;
      err.code = "PICK_FORBIDDEN";
      err.reason = "ALREADY_BOOSTER_IN_RAID";
      err.meta = { raidId, userId };
      throw err;
    }
  }

  // Regel 2: 90-Minuten-Kollision mit anderen Raids
  const raidDate = signup.raid?.date;
  const collides = await hasTimeCollisionWithin(prisma, {
    userId,
    raidId,
    raidDate,
    minutes: 90,
  });
  if (collides) {
    const err = new Error("Time collision within 90 minutes with another picked raid");
    err.status = 409;
    err.code = "PICK_FORBIDDEN";
    err.reason = "TIME_CONFLICT_90";
    err.meta = { userId, raidId, raidDate };
    throw err;
  }

  // alles ok → return
}

module.exports = {
  isLootRole,
  hasBoostCharAlreadyPickedInRaid,
  hasTimeCollisionWithin,
  assertCanPickSignup,
};

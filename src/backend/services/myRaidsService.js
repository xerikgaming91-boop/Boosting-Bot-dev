// src/backend/services/myRaidsService.js
const { prisma } = require("../prismaClient.js");
const { getCycleWindowFor, getNextCycleWindow } = require("../utils/cyclesWindow");

/**
 * Aggregiert Signups des Users inkl. Raid/Char.
 * Optionen:
 *  - scope: 'upcoming' | 'all'  (Default: 'upcoming')
 *  - cycle: 'current' | 'next' | 'all' (Default: 'all')
 *  - onlyPicked: boolean (Default: false)
 *
 * WICHTIG: Nutzer-Zuordnung erfolgt über
 *  (signup.userId == userId) ODER (signup.char.userId == userId)
 *  → damit auch Picks gefunden werden, wenn signup.userId nicht gesetzt ist.
 */
async function getForUser(userId, { scope = "upcoming", cycle = "all", onlyPicked = false } = {}) {
  const now = new Date();
  const userKey = String(userId || "");

  // Optional: Cycle-Filter
  let dateRange = null;
  try {
    if (cycle === "current") {
      const win = getCycleWindowFor(now);
      dateRange = { gte: win.start, lt: win.end };
    } else if (cycle === "next") {
      const win = getNextCycleWindow(now);
      dateRange = { gte: win.start, lt: win.end };
    }
  } catch (e) {
    console.warn("[myRaidsService] cycle filter error -> no dateRange:", e?.message || e);
  }

  // Grundfilter: diesem User zuordnen
  const whereUser = {
    OR: [
      { userId: userKey },
      { char: { userId: userKey } }, // falls signup.userId leer ist, aber der Char dem User gehört
    ],
  };

  // Optional: nur 'PICKED'
  const wherePicked = onlyPicked ? { status: "PICKED" } : {};

  const rows = await prisma.signup.findMany({
    where: {
      ...whereUser,
      ...wherePicked,
      ...(dateRange ? { raid: { date: dateRange } } : {}),
    },
    include: {
      raid: {
        select: {
          id: true,
          title: true,
          date: true,
          difficulty: true,
          lootType: true,
          bosses: true,
          lead: true,
        },
      },
      char: {
        select: { id: true, name: true, realm: true, class: true, spec: true, userId: true },
      },
    },
    orderBy: [{ raid: { date: "asc" } }, { id: "asc" }],
  });

  const mapped = rows
    .filter((s) => !!s.raid) // nur mit existierendem Raid
    .map((s) => ({
      raid: s.raid,
      signup: {
        id: s.id,
        status: s.status,
        type: s.type,
        saved: s.saved,
        note: s.note,
        class: s.class,
      },
      char: s.charId ? s.char : null,
    }));

  // Split: gepickt vs nicht gepickt
  const rostered = mapped.filter((x) => String(x.signup.status || "").toUpperCase() === "PICKED");
  const signups = mapped.filter((x) => String(x.signup.status || "").toUpperCase() !== "PICKED");

  // Split: upcoming vs past
  const split = (arr) => ({
    upcoming: arr.filter((x) => new Date(x.raid.date) >= now),
    past: arr.filter((x) => new Date(x.raid.date) < now),
  });

  const r = split(rostered);
  const s = split(signups);

  if (onlyPicked) {
    const upcoming = { rostered: r.upcoming, signups: [] };
    const past = { rostered: r.past, signups: [] };
    return scope === "upcoming" ? { upcoming } : { upcoming, past };
  }

  const upcoming = { rostered: r.upcoming, signups: s.upcoming };
  const past = { rostered: r.past, signups: s.past };
  return scope === "upcoming" ? { upcoming } : { upcoming, past };
}

module.exports = {
  getForUser,
};

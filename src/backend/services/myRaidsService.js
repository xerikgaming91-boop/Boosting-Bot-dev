// src/backend/services/myRaidsService.js
/**
 * Service-Layer für "My Raids"
 * - Liefert für einen User (Discord-ID) seine kommenden / vergangenen Raids,
 *   getrennt nach: rostered (PICKED) und signups (SIGNUPED).
 * - Nutzt Prisma direkt für performante Includes/Sortierung.
 */

const { prisma } = require("../prismaClient.js");

/** Minimal-Mapper für Raid-Objekt (einheitlicher Shape im Frontend) */
function mapRaid(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    difficulty: r.difficulty,
    lootType: r.lootType,
    date: r.date,
    lead: r.lead,
    bosses: r.bosses,
    channelId: r.channelId ?? null,
    messageId: r.messageId ?? null,
    presetId: r.presetId ?? null,
    detailUrl: `/raids/${r.id}`,
  };
}

/** Mapper für Signup + Char + Raid */
function mapEntry(row) {
  return {
    raid: mapRaid(row.raid),
    signup: {
      id: row.id,
      raidId: row.raidId,
      userId: row.userId ?? row.user?.discordId ?? null,
      status: row.status, // SIGNUPED | PICKED
      type: row.type,     // TANK | HEAL | DPS | LOOTBUDDY
      saved: !!row.saved,
      note: row.note ?? null,
      displayName: row.displayName ?? row.user?.displayName ?? row.user?.username ?? null,
      class: row.class ?? row.char?.class ?? null,
      createdAt: row.createdAt,
    },
    char: row.char
      ? {
          id: row.char.id,
          name: row.char.name,
          realm: row.char.realm,
          class: row.char.class ?? null,
          spec: row.char.spec ?? null,
          itemLevel: row.char.itemLevel ?? null,
          rioScore: row.char.rioScore ?? null,
          wclUrl: row.char.wclUrl ?? null,
        }
      : null,
  };
}

/**
 * Liefert strukturierte Daten für My-Raids.
 * scope: "upcoming" (default) | "all"
 */
exports.getForUser = async (userId, { scope = "upcoming" } = {}) => {
  const now = new Date();

  // Signups inklusive Char+Raid+User laden (einmalig)
  const rows = await prisma.signup.findMany({
    where: { userId: String(userId) },
    include: {
      raid: true,
      char: true,
      user: {
        select: { discordId: true, displayName: true, username: true },
      },
    },
    orderBy: [
      { raid: { date: "asc" } }, // für "upcoming" nützlich; wir sortieren unten ggf. je Bucket anders
      { id: "asc" },
    ],
  });

  const upcoming = { rostered: [], signups: [] };
  const past = { rostered: [], signups: [] };

  for (const row of rows) {
    const bucket = row.raid?.date && row.raid.date > now ? upcoming : past;
    const isRoster = String(row.status).toUpperCase() === "PICKED";
    if (isRoster) bucket.rostered.push(mapEntry(row));
    else bucket.signups.push(mapEntry(row));
  }

  // Sortierungen (upcoming aufsteigend, past absteigend)
  const byDateAsc = (a, b) => new Date(a.raid.date) - new Date(b.raid.date);
  const byDateDesc = (a, b) => new Date(b.raid.date) - new Date(a.raid.date);

  upcoming.rostered.sort(byDateAsc);
  upcoming.signups.sort(byDateAsc);
  past.rostered.sort(byDateDesc);
  past.signups.sort(byDateDesc);

  if (scope === "all") {
    return { upcoming, past };
  }
  return { upcoming };
};

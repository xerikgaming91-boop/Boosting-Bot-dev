// src/backend/models/raidModel.js
/**
 * Repository/Model für Raids (kapselt Prisma)
 * - Nur DB-Zugriffe, keine Business-Logik
 * - Controller/Service sprechen ausschließlich über diese Funktionen
 *
 * Prisma-Schema (relevant):
 * model Raid {
 *   id         Int      @id @default(autoincrement())
 *   title      String
 *   difficulty String
 *   lootType   String
 *   date       DateTime
 *   lead       String?
 *   bosses     Int
 *   tanks       Int @default(0)
 *   healers     Int @default(0)
 *   dps         Int @default(0)
 *   lootbuddies Int @default(0)
 *   channelId String?
 *   messageId String?
 *   presetId Int?
 *   preset   Preset? @relation(fields: [presetId], references: [id])
 *   signups  Signup[]
 *   createdAt DateTime @default(now())
 *   updatedAt DateTime @updatedAt
 *   @@index([date])
 * }
 */

const { prisma } = require("../prismaClient.js");

/* -------------------------------- Mapper -------------------------------- */

function map(r) {
  if (!r) return null;
  const base = {
    id: r.id,
    title: r.title,
    difficulty: r.difficulty,
    lootType: r.lootType,
    date: r.date,
    lead: r.lead || null,
    bosses: Number(r.bosses ?? 0),

    tanks: Number(r.tanks ?? 0),
    healers: Number(r.healers ?? 0),
    dps: Number(r.dps ?? 0),
    lootbuddies: Number(r.lootbuddies ?? 0),

    channelId: r.channelId || null,
    messageId: r.messageId || null,

    presetId: r.presetId ?? null,

    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };

  if (r._count?.signups != null) {
    base._counts = { signups: r._count.signups };
  }
  if (r.preset) {
    base.preset = {
      id: r.preset.id,
      name: r.preset.name,
      tanks: r.preset.tanks,
      healers: r.preset.healers,
      dps: r.preset.dps,
      lootbuddies: r.preset.lootbuddies,
    };
  }
  return base;
}

function buildInclude({ withCounts = false, withPreset = false } = {}) {
  const include = {};
  if (withCounts) include._count = { select: { signups: true } };
  if (withPreset) {
    include.preset = {
      select: { id: true, name: true, tanks: true, healers: true, dps: true, lootbuddies: true },
    };
  }
  return include;
}

/* -------------------------------- Queries -------------------------------- */

/**
 * Liste von Raids mit optionalen Filtern:
 *  - where: Prisma-Where (optional)
 *  - q: Volltext (title/lead enthält)
 *  - from, to: Datums-Range (inclusive/exclusive: gte/lt)
 *  - difficulty: exakter String (optional)
 *  - orderBy: Default [{ date: "asc" }]
 *  - withCounts, withPreset
 *  - take, skip
 */
async function findMany({
  where,
  q,
  from,
  to,
  difficulty,
  orderBy = [{ date: "asc" }],
  withCounts = true,
  withPreset = false,
  take,
  skip,
} = {}) {
  const w = { ...(where || {}) };

  if (q) {
    const s = String(q).trim();
    if (s) {
      w.OR = [
        { title: { contains: s } },
        { lead: { contains: s } },
      ];
    }
  }

  if (from || to) {
    w.date = Object.assign({}, w.date);
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) w.date.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) w.date.lt = d;
    }
  }

  if (difficulty) {
    w.difficulty = String(difficulty);
  }

  const rows = await prisma.raid.findMany({
    where: w,
    orderBy,
    include: buildInclude({ withCounts, withPreset }),
    take: take || undefined,
    skip: skip || undefined,
  });
  return rows.map(map);
}

/** Ein Raid per ID (optional mit Counts/Preset) */
async function findById(id, { withCounts = true, withPreset = true } = {}) {
  const row = await prisma.raid.findUnique({
    where: { id: Number(id) },
    include: buildInclude({ withCounts, withPreset }),
  });
  return map(row);
}
const getOne = findById;

/** Kommende Raids ab now (limit optional) */
async function upcoming({ from = new Date(), limit = 50, withCounts = true } = {}) {
  const rows = await prisma.raid.findMany({
    where: { date: { gte: new Date(from) } },
    orderBy: [{ date: "asc" }],
    take: limit,
    include: buildInclude({ withCounts, withPreset: false }),
  });
  return rows.map(map);
}

/* -------------------------------- Writes -------------------------------- */

function coerceInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/** Erstellen eines Raids */
async function create(data = {}) {
  const payload = {
    title: String(data.title || "").trim(),
    difficulty: String(data.difficulty || "").trim(), // z. B. "Normal|Heroic|Mythic"
    lootType: String(data.lootType || "").trim(),     // z. B. "MS>OS|Softres|GDKP"
    date: data.date ? new Date(data.date) : null,
    lead: data.lead != null ? String(data.lead) : null,
    bosses: coerceInt(data.bosses, 0),

    tanks: coerceInt(data.tanks, 0),
    healers: coerceInt(data.healers, 0),
    dps: coerceInt(data.dps, 0),
    lootbuddies: coerceInt(data.lootbuddies, 0),

    channelId: data.channelId ?? null,
    messageId: data.messageId ?? null,

    presetId: data.presetId != null ? Number(data.presetId) : null,
  };

  if (!payload.title) throw Object.assign(new Error("TITLE_REQUIRED"), { code: "VALIDATION" });
  if (!payload.difficulty) throw Object.assign(new Error("DIFFICULTY_REQUIRED"), { code: "VALIDATION" });
  if (!payload.lootType) throw Object.assign(new Error("LOOTTYPE_REQUIRED"), { code: "VALIDATION" });
  if (!(payload.date instanceof Date) || Number.isNaN(payload.date.getTime())) {
    throw Object.assign(new Error("DATE_REQUIRED"), { code: "VALIDATION" });
  }

  const row = await prisma.raid.create({
    data: payload,
    include: buildInclude({ withCounts: true, withPreset: true }),
  });
  return map(row);
}

/** Partielles Update */
async function update(id, patch = {}) {
  const data = {
    title: patch.title !== undefined ? String(patch.title || "").trim() : undefined,
    difficulty: patch.difficulty !== undefined ? String(patch.difficulty || "").trim() : undefined,
    lootType: patch.lootType !== undefined ? String(patch.lootType || "").trim() : undefined,
    date:
      patch.date !== undefined
        ? patch.date == null
          ? null
          : new Date(patch.date)
        : undefined,
    lead: patch.lead !== undefined ? (patch.lead == null ? null : String(patch.lead)) : undefined,
    bosses: patch.bosses !== undefined ? coerceInt(patch.bosses) : undefined,

    tanks: patch.tanks !== undefined ? coerceInt(patch.tanks) : undefined,
    healers: patch.healers !== undefined ? coerceInt(patch.healers) : undefined,
    dps: patch.dps !== undefined ? coerceInt(patch.dps) : undefined,
    lootbuddies: patch.lootbuddies !== undefined ? coerceInt(patch.lootbuddies) : undefined,

    channelId: patch.channelId !== undefined ? patch.channelId : undefined,
    messageId: patch.messageId !== undefined ? patch.messageId : undefined,

    presetId:
      patch.presetId !== undefined
        ? patch.presetId == null
          ? null
          : Number(patch.presetId)
        : undefined,
  };

  // leere Strings auf null heben bei einigen Feldern
  ["title", "difficulty", "lootType"].forEach((k) => {
    if (data[k] !== undefined && !String(data[k]).trim()) data[k] = undefined;
  });

  const row = await prisma.raid.update({
    where: { id: Number(id) },
    data,
    include: buildInclude({ withCounts: true, withPreset: true }),
  });
  return map(row);
}

/** Löschen (Signups werden via onDelete: Cascade entfernt) */
async function remove(id) {
  const row = await prisma.raid.delete({
    where: { id: Number(id) },
  });
  return map(row);
}

module.exports = {
  // Reads
  findMany,
  findById,
  getOne,
  upcoming,

  // Writes
  create,
  update,
  remove,

  // intern
  _map: map,
};

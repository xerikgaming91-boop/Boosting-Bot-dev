// src/backend/models/charModel.js
/**
 * Repository/Model für Booster-Chars (kapselt Prisma)
 * - Nur DB-Zugriffe, keine Business-Logik
 *
 * Prisma (relevant):
 * model BoosterChar {
 *   id        Int     @id @default(autoincrement())
 *   userId    String  // FK -> User.discordId
 *   name      String
 *   realm     String
 *   class     String?
 *   spec      String?
 *   rioScore  Float?
 *   progress  String?
 *   itemLevel Int?
 *   wclUrl    String?
 *   updatedAt DateTime @updatedAt
 *   user   User     @relation(fields: [userId], references: [discordId], onDelete: Cascade)
 *   signups Signup[]
 *   @@unique([userId, name, realm])
 *   @@index([userId])
 * }
 */

const { prisma } = require("../prismaClient.js");

/* -------------------------------- Mapper -------------------------------- */

function map(c) {
  if (!c) return null;
  return {
    id: c.id,
    userId: c.userId,              // Discord-ID
    name: c.name,
    realm: c.realm,
    class: c.class ?? null,
    spec: c.spec ?? null,
    rioScore: c.rioScore == null ? null : Number(c.rioScore),
    progress: c.progress ?? null,
    itemLevel: c.itemLevel == null ? null : Number(c.itemLevel),
    wclUrl: c.wclUrl ?? null,
    updatedAt: c.updatedAt,
  };
}

function toFloatOrNull(v) {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toIntOrNull(v) {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toStrOrNull(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/* -------------------------------- Queries -------------------------------- */

/**
 * Liste von Chars mit optionalen Filtern:
 *  - where: Prisma-Where
 *  - q: Volltext (name/realm/class/spec enthält)
 *  - userId: Discord-ID (Owner)
 *  - orderBy: Default [{ updatedAt: "desc" }, { name: "asc" }]
 *  - take/skip
 */
async function findMany({
  where,
  q,
  userId,
  orderBy = [{ updatedAt: "desc" }, { name: "asc" }],
  take,
  skip,
} = {}) {
  const w = { ...(where || {}) };
  if (userId) w.userId = String(userId);
  if (q) {
    const s = String(q).trim();
    if (s) {
      w.OR = [
        { name: { contains: s } },
        { realm: { contains: s } },
        { class: { contains: s } },
        { spec: { contains: s } },
      ];
    }
  }

  const rows = await prisma.boosterChar.findMany({
    where: w,
    orderBy,
    take: take || undefined,
    skip: skip || undefined,
  });
  return rows.map(map);
}

/** Alle Chars eines Users */
async function listByUser(discordUserId, opts) {
  return findMany({ ...(opts || {}), userId: String(discordUserId) });
}

/** Ein Char per ID */
async function findById(id) {
  const row = await prisma.boosterChar.findUnique({
    where: { id: Number(id) },
  });
  return map(row);
}

/** Ein Char per Unique-Key (userId+name+realm) */
async function findByKey({ userId, name, realm }) {
  const row = await prisma.boosterChar.findUnique({
    where: {
      userId_name_realm: {
        userId: String(userId),
        name: String(name),
        realm: String(realm),
      },
    },
  });
  return map(row);
}

/* -------------------------------- Writes -------------------------------- */

/**
 * Erstellen eines Chars
 * Required: userId (Discord), name, realm
 */
async function create(data = {}) {
  const payload = {
    userId: String(data.userId),
    name: String(data.name || "").trim(),
    realm: String(data.realm || "").trim(),
    class: toStrOrNull(data.class),
    spec: toStrOrNull(data.spec),
    rioScore: toFloatOrNull(data.rioScore),
    progress: toStrOrNull(data.progress),
    itemLevel: toIntOrNull(data.itemLevel),
    wclUrl: toStrOrNull(data.wclUrl),
  };

  if (!payload.userId) {
    const err = new Error("USER_ID_REQUIRED");
    err.code = "VALIDATION";
    throw err;
  }
  if (!payload.name) {
    const err = new Error("NAME_REQUIRED");
    err.code = "VALIDATION";
    throw err;
  }
  if (!payload.realm) {
    const err = new Error("REALM_REQUIRED");
    err.code = "VALIDATION";
    throw err;
  }

  const row = await prisma.boosterChar.create({ data: payload });
  return map(row);
}

/**
 * Idempotenter Upsert per Unique-Key (userId+name+realm)
 */
async function upsertByKey(data = {}) {
  const userId = String(data.userId);
  const name = String(data.name || "").trim();
  const realm = String(data.realm || "").trim();
  if (!userId || !name || !realm) {
    const err = new Error("USER_ID_NAME_REALM_REQUIRED");
    err.code = "VALIDATION";
    throw err;
  }

  const update = {
    class: toStrOrNull(data.class),
    spec: toStrOrNull(data.spec),
    rioScore: toFloatOrNull(data.rioScore),
    progress: toStrOrNull(data.progress),
    itemLevel: toIntOrNull(data.itemLevel),
    wclUrl: toStrOrNull(data.wclUrl),
  };

  const createData = {
    userId, name, realm,
    class: toStrOrNull(data.class) ?? null,
    spec: toStrOrNull(data.spec) ?? null,
    rioScore: toFloatOrNull(data.rioScore) ?? null,
    progress: toStrOrNull(data.progress) ?? null,
    itemLevel: toIntOrNull(data.itemLevel) ?? null,
    wclUrl: toStrOrNull(data.wclUrl) ?? null,
  };

  const row = await prisma.boosterChar.upsert({
    where: { userId_name_realm: { userId, name, realm } },
    update,
    create: createData,
  });
  return map(row);
}

/** Partielles Update per ID */
async function update(id, patch = {}) {
  const data = {
    class: toStrOrNull(patch.class),
    spec: toStrOrNull(patch.spec),
    rioScore: toFloatOrNull(patch.rioScore),
    progress: toStrOrNull(patch.progress),
    itemLevel: toIntOrNull(patch.itemLevel),
    wclUrl: toStrOrNull(patch.wclUrl),
    name: patch.name !== undefined ? String(patch.name || "").trim() : undefined,
    realm: patch.realm !== undefined ? String(patch.realm || "").trim() : undefined,
  };

  // Leere Strings für name/realm ignorieren
  ["name", "realm"].forEach((k) => {
    if (data[k] !== undefined && !data[k]) data[k] = undefined;
  });

  const row = await prisma.boosterChar.update({
    where: { id: Number(id) },
    data,
  });
  return map(row);
}

/** Löschen per ID */
async function remove(id) {
  const row = await prisma.boosterChar.delete({
    where: { id: Number(id) },
  });
  return map(row);
}

module.exports = {
  // Reads
  findMany,
  listByUser,
  findById,
  findByKey,

  // Writes
  create,
  upsertByKey,
  update,
  remove,

  // intern
  _map: map,
};

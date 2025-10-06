// src/backend/models/userModel.js
/**
 * Users Model/Repository (Prisma)
 * - Kapselt alle DB-Zugriffe rund um User
 * - Keine Business-Logik/RBAC
 *
 * API (vom Users-Controller genutzt):
 *   - findMany({ where, orderBy })
 *   - findOne(discordId)
 *   - upsert(data)
 *   - update(discordId, patch)
 */

const { prisma } = require("../prismaClient.js");

/* -------------------------------- Mapper -------------------------------- */

function map(u) {
  if (!u) return null;
  return {
    id: u.id, // interner PK (kann nützlich sein)
    discordId: u.discordId,
    username: u.username ?? null,
    displayName: u.displayName ?? null,
    avatarUrl: u.avatarUrl ?? null,

    // Rollen / Flags
    rolesCsv: u.rolesCsv ?? null,
    isRaidlead: !!u.isRaidlead,
    isAdmin: !!u.isAdmin,
    isOwner: !!u.isOwner,
    highestRole: u.highestRole ?? null,
    roleLevel: Number.isFinite(u.roleLevel) ? u.roleLevel : 0,

    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/* -------------------------------- Queries -------------------------------- */

/**
 * Liste von Usern.
 * @param {{ where?:object, orderBy?:Array<object> }} opts
 */
exports.findMany = async ({ where, orderBy } = {}) => {
  const rows = await prisma.user.findMany({
    where: where || undefined,
    orderBy: orderBy || [{ updatedAt: "desc" }],
  });
  return rows.map(map);
};

/** Ein User per Discord-ID (Unique) */
exports.findOne = async (discordId) => {
  if (!discordId) return null;
  const u = await prisma.user.findUnique({
    where: { discordId: String(discordId) },
  });
  return map(u);
};

/* -------------------------------- Writes -------------------------------- */

/**
 * Upsert per Discord-ID.
 * Erwartet:
 * {
 *   discordId, username?, displayName?, avatarUrl?,
 *   rolesCsv?, isRaidlead?, isAdmin?, isOwner?,
 *   highestRole?, roleLevel?
 * }
 * - `undefined` -> Feld unverändert lassen
 * - `null` -> DB NULL setzen (wo sinnvoll)
 */
exports.upsert = async (data = {}) => {
  const discordId = String(data.discordId || "");
  if (!discordId) {
    const err = new Error("discordId_required");
    err.code = "VALIDATION";
    throw err;
  }

  const update = {
    username: data.username ?? undefined,
    displayName: data.displayName ?? undefined,
    avatarUrl: data.avatarUrl ?? undefined,
    rolesCsv: data.rolesCsv ?? undefined,
    isRaidlead: data.isRaidlead ?? undefined,
    isAdmin: data.isAdmin ?? undefined,
    isOwner: data.isOwner ?? undefined,
    highestRole: data.highestRole ?? undefined,
    roleLevel: data.roleLevel ?? undefined,
  };

  const createData = {
    discordId,
    username: data.username ?? null,
    displayName: data.displayName ?? null,
    avatarUrl: data.avatarUrl ?? null,
    rolesCsv: data.rolesCsv ?? null,
    isRaidlead: !!data.isRaidlead,
    isAdmin: !!data.isAdmin,
    isOwner: !!data.isOwner,
    highestRole: data.highestRole ?? null,
    roleLevel: Number.isFinite(data.roleLevel) ? data.roleLevel : 0,
  };

  const saved = await prisma.user.upsert({
    where: { discordId },
    update,
    create: createData,
  });
  return map(saved);
};

/**
 * Partielles Update per Discord-ID.
 * @param {string} discordId
 * @param {object} patch
 */
exports.update = async (discordId, patch = {}) => {
  const data = {
    username: patch.username !== undefined ? patch.username : undefined,
    displayName: patch.displayName !== undefined ? patch.displayName : undefined,
    avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : undefined,
    rolesCsv: patch.rolesCsv !== undefined ? patch.rolesCsv : undefined,
    isRaidlead: patch.isRaidlead !== undefined ? !!patch.isRaidlead : undefined,
    isAdmin: patch.isAdmin !== undefined ? !!patch.isAdmin : undefined,
    isOwner: patch.isOwner !== undefined ? !!patch.isOwner : undefined,
    highestRole: patch.highestRole !== undefined ? patch.highestRole : undefined,
    roleLevel: patch.roleLevel !== undefined ? Number(patch.roleLevel) : undefined,
  };

  const saved = await prisma.user.update({
    where: { discordId: String(discordId) },
    data,
  });
  return map(saved);
};

// optional für Tests/Diagnose
exports._map = map;

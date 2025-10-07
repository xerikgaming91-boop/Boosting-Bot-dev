// src/backend/models/raidModel.js
/**
 * Raid Model (Repository)
 * - Enthält NUR DB-Zugriffe (Prisma)
 * - Keine HTTP/Role-Logik; das macht der Controller
 */

const { prisma } = require("../prismaClient.js");

/** Mapper: Prisma → flaches JSON */
function map(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty,      // "Normal" | "Heroic" | "Mythic"
    lootType: row.lootType,          // "saved" | "unsaved" | "vip"
    bosses: row.bosses ?? 0,         // 0..8
    date: row.date,
    lead: row.lead || null,          // discord id (string) oder null
    presetId: row.presetId ?? null,

    channelId: row.channelId ?? null,
    messageId: row.messageId ?? null,

    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Liste holen (optional where/orderBy/limit/offset) */
async function findMany({ where, orderBy, take, skip } = {}) {
  const rows = await prisma.raid.findMany({
    where: where || undefined,
    orderBy: orderBy || [{ date: "asc" }, { id: "asc" }],
    take: take || undefined,
    skip: skip || undefined,
  });
  return rows.map(map);
}

/** Einzelnen Raid per ID */
async function findOne(id) {
  const row = await prisma.raid.findUnique({
    where: { id: Number(id) },
  });
  return map(row);
}

/** Anlegen */
async function create(data) {
  const saved = await prisma.raid.create({
    data: {
      title: String(data.title),
      difficulty: String(data.difficulty),
      lootType: String(data.lootType),
      bosses: Number.isFinite(Number(data.bosses)) ? Number(data.bosses) : 0,
      date: new Date(data.date),
      lead: data.lead ?? null,
      presetId: data.presetId ?? null,

      // optional technisch vorhandene Felder:
      channelId: data.channelId ?? null,
      messageId: data.messageId ?? null,
    },
  });
  return map(saved);
}

/** Patch/Update */
async function update(id, patch) {
  const saved = await prisma.raid.update({
    where: { id: Number(id) },
    data: {
      title: patch.title !== undefined ? patch.title : undefined,
      difficulty: patch.difficulty !== undefined ? patch.difficulty : undefined,
      lootType: patch.lootType !== undefined ? patch.lootType : undefined,
      bosses:
        patch.bosses !== undefined
          ? Number.isFinite(Number(patch.bosses))
            ? Number(patch.bosses)
            : 0
          : undefined,
      date:
        patch.date !== undefined
          ? new Date(patch.date)
          : undefined,
      lead: patch.lead !== undefined ? patch.lead : undefined,
      presetId:
        patch.presetId !== undefined ? patch.presetId : undefined,

      channelId:
        patch.channelId !== undefined ? patch.channelId : undefined,
      messageId:
        patch.messageId !== undefined ? patch.messageId : undefined,
    },
  });
  return map(saved);
}

/** Löschen */
async function remove(id) {
  await prisma.raid.delete({
    where: { id: Number(id) },
  });
  return true;
}

module.exports = {
  findMany,
  findOne,
  create,
  update,
  remove,
  _map: map, // (optional) für Tests
};

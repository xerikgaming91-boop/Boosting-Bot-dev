// src/backend/models/raidModel.js
// Reines DB-Repository (keine Business-Logik)

const { prisma } = require("../prismaClient.js");

function map(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    difficulty: r.difficulty, // "nhc" | "hc" | "mythic"
    lootType: r.lootType,     // "saved" | "unsaved" | "vip"
    bosses: r.bosses,         // 8 (NHC/HC) bzw. 1..8 (Mythic)
    date: r.date,             // Date
    lead: r.lead,             // z.B. Discord-ID
    presetId: r.presetId ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

exports.findMany = async ({ where, orderBy, select } = {}) => {
  const rows = await prisma.raid.findMany({
    where: where || undefined,
    orderBy: orderBy || [{ date: "desc" }],
    select:
      select ||
      {
        id: true,
        title: true,
        difficulty: true,
        lootType: true,
        bosses: true,
        date: true,
        lead: true,
        presetId: true,
        createdAt: true,
        updatedAt: true,
      },
  });
  return rows.map(map);
};

exports.findById = async (id, { select } = {}) => {
  const raidId = Number(id);
  if (!Number.isFinite(raidId)) return null;
  const row = await prisma.raid.findUnique({
    where: { id: raidId },
    select:
      select ||
      {
        id: true,
        title: true,
        difficulty: true,
        lootType: true,
        bosses: true,
        date: true,
        lead: true,
        presetId: true,
        createdAt: true,
        updatedAt: true,
      },
  });
  return map(row);
};

exports.create = async (data) => {
  const row = await prisma.raid.create({
    data,
    select: {
      id: true,
      title: true,
      difficulty: true,
      lootType: true,
      bosses: true,
      date: true,
      lead: true,
      presetId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return map(row);
};

exports.update = async (id, data) => {
  const raidId = Number(id);
  const row = await prisma.raid.update({
    where: { id: raidId },
    data,
    select: {
      id: true,
      title: true,
      difficulty: true,
      lootType: true,
      bosses: true,
      date: true,
      lead: true,
      presetId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return map(row);
};

exports.remove = async (id) => {
  const raidId = Number(id);
  const row = await prisma.raid.delete({
    where: { id: raidId },
    select: { id: true },
  });
  return row;
};

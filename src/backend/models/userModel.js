// src/backend/models/userModel.js
const { prisma } = require("../prismaClient.js");

// Mapper -> nur Felder, die das Frontend erwartet
function map(row) {
  if (!row) return null;
  return {
    id: row.id,
    discordId: row.discordId,
    username: row.username || null,
    displayName: row.displayName || null,
    avatarUrl: row.avatarUrl || null,

    rolesCsv: row.rolesCsv || null,
    highestRole: row.highestRole || null,
    roleLevel: row.roleLevel ?? 0,
    isRaidlead: !!row.isRaidlead,
    isAdmin: !!row.isAdmin,
    isOwner: !!row.isOwner,

    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Upsert anhand discordId (unique)
async function upsertFromDiscord(payload) {
  const saved = await prisma.user.upsert({
    where: { discordId: String(payload.discordId) },
    create: {
      discordId: String(payload.discordId),
      username: payload.username || null,
      displayName: payload.displayName || null,
      avatarUrl: payload.avatarUrl || null,

      rolesCsv: payload.rolesCsv || null,
      highestRole: payload.highestRole || null,
      roleLevel: payload.roleLevel ?? 0,
      isRaidlead: !!payload.isRaidlead,
      isAdmin: !!payload.isAdmin,
      isOwner: !!payload.isOwner,
    },
    update: {
      username: payload.username || null,
      displayName: payload.displayName || null,
      avatarUrl: payload.avatarUrl || null,

      rolesCsv: payload.rolesCsv || null,
      highestRole: payload.highestRole || null,
      roleLevel: payload.roleLevel ?? 0,
      isRaidlead: !!payload.isRaidlead,
      isAdmin: !!payload.isAdmin,
      isOwner: !!payload.isOwner,
    },
  });
  return map(saved);
}

async function findByDiscordId(discordId) {
  const row = await prisma.user.findUnique({ where: { discordId: String(discordId) } });
  return map(row);
}

async function findLeads() {
  const rows = await prisma.user.findMany({
    where: { OR: [{ isRaidlead: true }, { roleLevel: { gte: 1 } }] },
    orderBy: [{ roleLevel: "desc" }, { username: "asc" }],
    take: 200,
  });
  return rows.map(map);
}

module.exports = {
  upsertFromDiscord,
  findByDiscordId,
  findLeads,
};

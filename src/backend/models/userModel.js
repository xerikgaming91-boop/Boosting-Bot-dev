// src/backend/models/userModel.js
// Prisma-Model-Layer für Discord-User

const { prisma } = require("../prismaClient");

/** Einheitliches API-Shape */
function mapBase(u) {
  if (!u) return null;
  return {
    id: u.id ?? null,
    discordId: String(u.discordId),
    displayName: u.displayName || null,
    username: u.username || null,
    avatarUrl: u.avatarUrl || null,

    // Rollen/Flags
    isOwner: !!u.isOwner,
    isAdmin: !!u.isAdmin,
    isRaidlead: !!u.isRaidlead,
    roleLevel: u.roleLevel ?? 0,
    highestRole: u.highestRole ?? null,
    rolesCsv: u.rolesCsv ?? null,

    // Timestamps (falls vorhanden)
    createdAt: u.createdAt ?? null,
    updatedAt: u.updatedAt ?? null,
  };
}

/* ------------------------------- Reads ---------------------------------- */

async function findMany(opts = {}) {
  const {
    where,
    orderBy = [{ displayName: "asc" }, { username: "asc" }],
    select,
  } = opts || {};

  const rows = await prisma.user.findMany({
    where,
    orderBy,
    select:
      select ||
      {
        id: true,
        discordId: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        isOwner: true,
        isAdmin: true,
        isRaidlead: true,
        roleLevel: true,
        rolesCsv: true,
        highestRole: true,
        createdAt: true,
        updatedAt: true,
      },
  });
  return rows.map(mapBase);
}

async function findUnique(where) {
  const u = await prisma.user.findUnique({
    where,
    select: {
      id: true,
      discordId: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      isOwner: true,
      isAdmin: true,
      isRaidlead: true,
      roleLevel: true,
      rolesCsv: true,
      highestRole: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return mapBase(u);
}

async function findByDiscordId(discordId) {
  return findUnique({ discordId: String(discordId) });
}

/** Nur Leads (isRaidlead = true) */
async function findLeads() {
  const rows = await prisma.user.findMany({
    where: { isRaidlead: true },
    orderBy: [{ displayName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      discordId: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      isRaidlead: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows.map(mapBase);
}

/* ------------------------------ Writes ---------------------------------- */

async function create(data) {
  const u = await prisma.user.create({ data });
  return mapBase(u);
}

async function update(where, data) {
  const u = await prisma.user.update({ where, data });
  return mapBase(u);
}

async function updateByDiscordId(discordId, data) {
  return update({ discordId: String(discordId) }, data);
}

async function remove(where) {
  const u = await prisma.user.delete({ where });
  return mapBase(u);
}

async function removeByDiscordId(discordId) {
  return remove({ discordId: String(discordId) });
}

/**
 * Upsert vom Discord-Login:
 * - keyed by discordId (muss in Prisma als unique definiert sein; falls nicht, bitte ergänzen)
 * - schreibt Meta/Flags, ohne sensible Tokens zu speichern
 */
async function upsertFromDiscord(payload) {
  const discordId = String(payload.discordId);
  // Fallback ohne Prisma-upsert (funktioniert auch, wenn discordId in der DB nicht unique ist)
  const existing = await prisma.user.findUnique({
    where: { discordId },
    select: { id: true },
  }).catch(() => null);

  const data = {
    username: payload.username ?? undefined,
    displayName: payload.displayName ?? undefined,
    avatarUrl: payload.avatarUrl ?? undefined,
    rolesCsv: payload.rolesCsv ?? undefined,
    highestRole: payload.highestRole ?? undefined,
    roleLevel: payload.roleLevel ?? undefined,
    isOwner: payload.isOwner ?? undefined,
    isAdmin: payload.isAdmin ?? undefined,
    isRaidlead: payload.isRaidlead ?? undefined,
  };

  let row;
  if (existing) {
    row = await prisma.user.update({ where: { discordId }, data });
  } else {
    row = await prisma.user.create({ data: { discordId, ...data } });
  }
  return mapBase(row);
}

module.exports = {
  // reads
  findMany,
  findUnique,
  findByDiscordId,
  findLeads,

  // writes
  create,
  update,
  updateByDiscordId,
  remove,
  removeByDiscordId,

  // upsert for OAuth flow
  upsertFromDiscord,
};

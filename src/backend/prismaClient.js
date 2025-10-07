// src/backend/prismaClient.js
// Zentrale Prisma-Instanz (CommonJS). Fällt auf src/backend/Prisma/dev.db zurück, wenn .env fehlt.

const path = require("path");
const { PrismaClient } = require("@prisma/client");

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const abs = path.resolve(__dirname, "Prisma", "dev.db"); // Großes 'P'!
  process.env.DATABASE_URL = "file:" + abs.replace(/\\/g, "/");
}

ensureDatabaseUrl();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["warn", "error"],
});

process.on("beforeExit", async () => {
  try { await prisma.$disconnect(); } catch {}
});

module.exports = { prisma };

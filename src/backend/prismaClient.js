// src/backend/prismaClient.js
const path = require("path");
const { PrismaClient } = require("@prisma/client");

// Falls DATABASE_URL fehlt, absolut auf prisma/dev.db setzen (Windows-fest)
function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const abs = path.resolve(__dirname, "..", "..", "prisma", "dev.db");
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

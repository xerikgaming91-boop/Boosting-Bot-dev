// src/backend/prismaClient.js (CommonJS)
const { PrismaClient } = require("@prisma/client");

// Singleton, verhindert Mehrfach-Instanzen im Dev-HMR
let prisma;
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__PRISMA__) {
    global.__PRISMA__ = new PrismaClient();
  }
  prisma = global.__PRISMA__;
}

module.exports = { prisma };

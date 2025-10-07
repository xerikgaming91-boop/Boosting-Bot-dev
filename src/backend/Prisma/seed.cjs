const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const raid = await prisma.raid.create({
    data: {
      title: "Manaforge Heroic VIP",
      difficulty: "HC",
      lootType: "vip",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lead: "1",  // später durch DisplayName ersetzt, Frontend mappt bereits
      bosses: 8,
    },
  });
  console.log("Seeded raid:", raid.id);
}

main().finally(async () => prisma.$disconnect());

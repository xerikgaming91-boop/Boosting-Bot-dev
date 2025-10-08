// src/backend/Prisma/seed.cjs
// Legt 3 User und 5 Chars an (idempotent per upsert).
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function upsertUser({ discordId, username, displayName, flags = {} }) {
  return prisma.user.upsert({
    where: { discordId: String(discordId) },
    update: {
      username: username ?? undefined,
      displayName: displayName ?? undefined,
      highestRole: flags.highestRole ?? undefined,
      roleLevel: flags.roleLevel ?? undefined,
      isOwner: flags.isOwner ?? undefined,
      isAdmin: flags.isAdmin ?? undefined,
      isRaidlead: flags.isRaidlead ?? undefined,
    },
    create: {
      discordId: String(discordId),
      username: username ?? null,
      displayName: displayName ?? null,
      avatarUrl: null,
      rolesCsv: null,
      highestRole: flags.highestRole ?? null,
      roleLevel: flags.roleLevel ?? 0,
      isOwner: !!flags.isOwner,
      isAdmin: !!flags.isAdmin,
      isRaidlead: !!flags.isRaidlead,
    },
  });
}

async function upsertChar({ userId, name, realm, className, spec, rioScore, itemLevel, progress, wclUrl }) {
  return prisma.boosterChar.upsert({
    where: {
      userId_name_realm: {
        userId: String(userId),
        name: String(name),
        realm: String(realm),
      },
    },
    update: {
      class: className ?? null,
      spec: spec ?? null,
      rioScore: rioScore ?? null,
      itemLevel: itemLevel ?? null,
      progress: progress ?? null,
      wclUrl: wclUrl ?? null,
    },
    create: {
      userId: String(userId),
      name: String(name),
      realm: String(realm),
      class: className ?? null,
      spec: spec ?? null,
      rioScore: rioScore ?? null,
      itemLevel: itemLevel ?? null,
      progress: progress ?? null,
      wclUrl: wclUrl ?? null,
    },
  });
}

async function main() {
  // Beispiel-User (discordId = FK für BoosterChar.userId)
  const users = [
    { discordId: "1421928000000000001", username: "syntax", displayName: "Syntax", flags: { isOwner: true, roleLevel: 3, highestRole: "owner" } },
    { discordId: "1421928000000000002", username: "nova",   displayName: "Nova",   flags: { isAdmin: true, roleLevel: 2, highestRole: "admin" } },
    { discordId: "1421928000000000003", username: "rogue",  displayName: "RogueOne", flags: { isRaidlead: true, roleLevel: 1, highestRole: "raidlead" } },
  ];

  console.log("→ upsert users…");
  for (const u of users) {
    const saved = await upsertUser(u);
    console.log("  ✓ user", saved.discordId, "→", saved.displayName || saved.username);
  }

  // 5 Beispiel-Chars
  const chars = [
    {
      userId: "1228761152239046769",
      name: "Syntaxx",
      realm: "Blackrock",
      className: "Warrior",
      spec: "Fury",
      rioScore: 2875.4,
      itemLevel: 528,
      progress: "8/8 Mythic",
    },
    {
      userId: "1228761152239046769",
      name: "Synheals",
      realm: "Blackrock",
      className: "Priest",
      spec: "Holy",
      rioScore: 0,
      itemLevel: 522,
      progress: "Normal",
    },
    {
      userId: "1228761152239046769",
      name: "Novalyn",
      realm: "Tarren Mill",
      className: "Mage",
      spec: "Fire",
      rioScore: 3011.2,
      itemLevel: 531,
      progress: "9/9 Heroic",
    },
    {
      userId: "1228761152239046769",
      name: "Novatank",
      realm: "Tarren Mill",
      className: "Paladin",
      spec: "Protection",
      rioScore: 2803.7,
      itemLevel: 530,
      progress: "8/8 Heroic",
    },
    {
      userId: "1228761152239046769",
      name: "Slice",
      realm: "Ragnaros",
      className: "Rogue",
      spec: "Outlaw",
      rioScore: 2950.0,
      itemLevel: 529,
      progress: "8/8 Heroic",
    },
  ];

  console.log("→ upsert chars…");
  for (const c of chars) {
    const saved = await upsertChar(c);
    console.log(`  ✓ ${saved.name}-${saved.realm} (user ${saved.userId})`);
  }

  console.log("✔ seed completed.");
}

main()
  .catch((e) => {
    console.error("seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

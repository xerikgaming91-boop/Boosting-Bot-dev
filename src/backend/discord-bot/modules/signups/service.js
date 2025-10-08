// src/backend/discord-bot/modules/signups/service.js
/**
 * Adapter für den Discord-Bot:
 * - nutzt den App-internen signupsService direkt (kein HTTP)
 * - baut dafür einen "actor" (User mit Rollen) aus der DB
 */
const { prisma } = require("../../../prismaClient.js");
const signupSvc = require("../../../services/signupService.js"); // <-- dein Service
const { syncRaid } = require("../raids/sync.js");

async function getActor(discordUserId) {
  // User mit Rollen für Berechtigungslogik im Service
  const u = await prisma.user.findUnique({
    where: { discordId: String(discordUserId) },
    select: {
      discordId: true,
      username: true,
      displayName: true,
      isAdmin: true,
      isOwner: true,
      isRaidlead: true,
    },
  });
  // Falls nicht vorhanden (erster Bot-Kontakt), minimaler Actor
  return (
    u || {
      discordId: String(discordUserId),
      username: null,
      displayName: null,
      isAdmin: false,
      isOwner: false,
      isRaidlead: false,
    }
  );
}

/**
 * Normale Anmeldung (Char + Rolle + Saved/Unsaved + Notiz)
 * Erwartet:
 *  - raidId, userId (Discord), displayName
 *  - charId, role ("TANK"|"HEAL"|"DPS"), saved (bool), note (optional)
 */
async function signupNormal({ raidId, userId, displayName, charId, role, saved, note }) {
  const actor = await getActor(userId);

  // Service-API: create({ ... }, { actor })
  const created = await signupSvc.create(
    {
      raidId: Number(raidId),
      userId: String(userId),
      type: String(role || "DPS").toUpperCase(), // "TANK"|"HEAL"|"DPS"
      charId: Number(charId),
      displayName: displayName || actor.displayName || actor.username || String(userId),
      saved: !!saved, // Service validiert, ob actor das darf
      note: note || null,
      class: null, // kommt vom Char
      status: "SIGNUPED",
    },
    { actor }
  );

  await syncRaid(raidId).catch(() => {});
  return { created: true, signup: created };
}

/**
 * Lootbuddy-Anmeldung (nur Klasse + optionale Notiz)
 * Erwartet:
 *  - raidId, userId (Discord), displayName
 *  - klass (String), note (optional)
 */
async function signupLootbuddy({ raidId, userId, displayName, klass, note }) {
  const actor = await getActor(userId);

  const created = await signupSvc.create(
    {
      raidId: Number(raidId),
      userId: String(userId),
      type: "LOOTBUDDY",
      charId: null,
      displayName: displayName || actor.displayName || actor.username || String(userId),
      saved: false, // Lootbuddys default unsaved; Service kann dennoch prüfen
      note: note || null,
      class: klass || null,
      status: "SIGNUPED",
    },
    { actor }
  );

  await syncRaid(raidId).catch(() => {});
  return { created: true, signup: created };
}

/**
 * Abmelden: löscht die Anmeldung des Users in diesem Raid (falls vorhanden)
 * Erwartet: raidId, userId (Discord)
 */
async function cancel(raidId, userId) {
  // Signup des Users in diesem Raid suchen
  const existing = await prisma.signup.findFirst({
    where: { raidId: Number(raidId), userId: String(userId) },
    select: { id: true },
  });
  if (!existing) return { missing: true };

  // Bevorzugt Service zum Löschen verwenden, wenn vorhanden
  if (typeof signupSvc.remove === "function") {
    await signupSvc.remove(existing.id);
  } else {
    await prisma.signup.delete({ where: { id: existing.id } });
  }

  await syncRaid(raidId).catch(() => {});
  return { deleted: true };
}

module.exports = { signupNormal, signupLootbuddy, cancel };

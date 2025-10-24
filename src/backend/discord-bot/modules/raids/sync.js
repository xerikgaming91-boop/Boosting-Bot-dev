// src/backend/discord-bot/modules/raids/sync.js
const { getClient } = require("../../core/client.js");
const { ensureChannel, channelNameFromRaid } = require("./channel.js");
const { postOrUpdateRaidMessage } = require("./message.js");
const { prisma } = require("../../../prismaClient.js");

/**
 * Synchronisiert einen Raid in Discord.
 * - Erstellt/sichert den Channel
 * - Aktualisiert das Embed
 * - Optional: benennt den Channel um (nur, wenn allowRename=true)
 *
 * @param {number|object} raidOrId - Raid-ID oder bereits geladener Raid
 * @param {{ allowRename?: boolean }} [opts]
 * @returns {Promise<string|null>} channelId
 */
async function syncRaid(raidOrId, opts = {}) {
  const { allowRename = false } = opts;

  const ctx = await getClient();
  if (ctx.inactive) return null;

  const raid =
    typeof raidOrId === "object"
      ? raidOrId
      : await prisma.raid.findUnique({ where: { id: Number(raidOrId) } });

  if (!raid) throw new Error("Raid not found");

  // Lead-Name für das Embed ermitteln
  let leadName = null;
  if (raid.lead) {
    const u = await prisma.user.findUnique({
      where: { discordId: String(raid.lead) },
      select: { displayName: true, username: true },
    });
    leadName = u?.displayName || u?.username || null;
  }

  // Channel sicherstellen
  const ch = await ensureChannel(raid);
  if (!ch) return null;

  // Nur bei expliziter Freigabe umbenennen (z. B. nach Raid-Edit)
  if (allowRename) {
    // 🔧 BUGFIX: channelNameFromRaid(...) liefert ein Objekt – wir brauchen .final
    const desired = channelNameFromRaid(raid, leadName).final;
    if (desired && ch.name !== desired) {
      await ch.setName(desired, "Raid aktualisiert");
    }
  }

  // Embed posten/aktualisieren (immer)
  await postOrUpdateRaidMessage(ch, raid, leadName);
  return ch.id;
}

module.exports = { syncRaid };

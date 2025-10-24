// src/backend/discord-bot/modules/raids/sync.js
const { getClient } = require("../../core/client.js");
const { ensureChannel, channelNameFromRaid } = require("./channel.js");
const { postOrUpdateRaidMessage } = require("./message.js");
const { prisma } = require("../../../prismaClient.js");

async function syncRaid(raidOrId) {
  const ctx = await getClient();
  if (ctx.inactive) return null;

  const raid = typeof raidOrId === "object" ? raidOrId
              : await prisma.raid.findUnique({ where: { id: Number(raidOrId) } });
  if (!raid) throw new Error("Raid not found");

  let leadName = null;
  if (raid.lead) {
    const u = await prisma.user.findUnique({
      where: { discordId: String(raid.lead) },
      select: { displayName: true, username: true },
    });
    leadName = u?.displayName || u?.username || raid.lead;
  }

  const ch = await ensureChannel(raid);
  if (!ch) return null;

  const desired = channelNameFromRaid(raid);
  if (ch.name !== desired) await ch.setName(desired, "Raid aktualisiert");

  await postOrUpdateRaidMessage(ch, raid, leadName);
  return ch.id;
}

module.exports = { syncRaid };

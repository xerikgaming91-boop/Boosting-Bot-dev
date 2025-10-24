// src/backend/discord-bot/modules/raids/message.js
const { getClient } = require("../../core/client.js");
const { buildRaidEmbeds } = require("../../core/embeds.js");
const { prisma } = require("../../../prismaClient.js");

const CUSTOM_IDS = {
  signup:   (raidId) => `raid_signup_${raidId}`,
  cancel:   (raidId) => `raid_cancel_${raidId}`,
  loot:     (raidId) => `raid_loot_${raidId}`,
};

async function postOrUpdateRaidMessage(channel, raid, leadDisplayName) {
  const { discord } = await getClient();

  // Signups laden für Roster/Signups-Embeds
  const signups = await prisma.signup.findMany({
    where: { raidId: raid.id },
    include: { char: { select: { name: true, realm: true, class: true } } },
    orderBy: [{ saved: "desc" }, { createdAt: "asc" }],
  });

  const payload = buildRaidEmbeds(raid, signups, leadDisplayName);

  // Buttons (Anmelden/Abmelden/Lootbuddy)
  const row = new discord.ActionRowBuilder().addComponents(
    new discord.ButtonBuilder()
      .setCustomId(CUSTOM_IDS.signup(raid.id))
      .setLabel("Anmelden")
      .setStyle(discord.ButtonStyle.Success),
    new discord.ButtonBuilder()
      .setCustomId(CUSTOM_IDS.cancel(raid.id))
      .setLabel("Abmelden")
      .setStyle(discord.ButtonStyle.Secondary),
    new discord.ButtonBuilder()
      .setCustomId(CUSTOM_IDS.loot(raid.id))
      .setLabel("Lootbuddy")
      .setStyle(discord.ButtonStyle.Primary)
  );

  // 🔎 Debug: was haben wir vor?
  try {
    if (raid.messageId) {
      console.log("[raid:message] edit message", { raidId: raid.id, messageId: raid.messageId });
      const msg = await channel.messages.fetch(raid.messageId);
      if (msg) {
        await msg.edit({ ...payload, components: [row] });
        return msg;
      }
    }
  } catch (e) {
    console.warn("[raid:message] edit failed – fallback to send", e?.message || e);
  }

  console.log("[raid:message] send new message", { raidId: raid.id });
  const msg = await channel.send({ ...payload, components: [row] });

  try {
    await prisma.raid.update({ where: { id: raid.id }, data: { messageId: msg.id } });
    console.log("[raid:message] messageId persisted", { raidId: raid.id, messageId: msg.id });
  } catch (e) {
    console.warn("[raid:message] persist messageId failed", e?.message || e);
  }

  return msg;
}

module.exports = { postOrUpdateRaidMessage, CUSTOM_IDS };

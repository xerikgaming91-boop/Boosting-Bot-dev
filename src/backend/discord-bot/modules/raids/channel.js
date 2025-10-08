// src/backend/discord-bot/modules/raids/channel.js
const { getClient } = require("../../core/client.js");
const { prisma } = require("../../../prismaClient.js");

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CAT_ID   = process.env.DISCORD_RAID_CATEGORY_ID;

const ROLE_ADMIN_ID      = process.env.DISCORD_ROLE_ADMIN_ID;
const ROLE_RAIDLEAD_ID   = process.env.RAIDLEAD_ROLE_ID;
const ROLE_BOOSTER_ID    = process.env.DISCORD_ROLE_BOOSTER_ID;
const ROLE_LOOTBUDDYS_ID = process.env.DISCORD_ROLE_LOOTBUDDYS_ID;

function slug(v) {
  return String(v || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function channelNameFromRaid(raid) {
  const dt = new Date(raid.date || Date.now());
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const diff = (raid.difficulty || "").toLowerCase();
  const loot = (raid.lootType || "").toLowerCase();
  let base = `raid-${y}${m}${d}-${diff}-${loot}`;
  if (diff === "mythic" && Number(raid.bosses) > 0) base += `-${raid.bosses}of8`;
  return slug(base);
}

async function ensureChannel(raid) {
  const { client, discord, inactive } = await getClient();
  if (inactive) return null;
  if (!GUILD_ID) throw new Error("DISCORD_BOT: DISCORD_GUILD_ID fehlt");

  const guild = await client.guilds.fetch(GUILD_ID);

  // Reuse bestehenden Channel, falls in DB vorhanden
  if (raid.channelId) {
    try {
      const existing = await guild.channels.fetch(raid.channelId);
      if (existing) return existing;
    } catch { /* ggf. gelöscht → neu erstellen */ }
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [discord.PermissionFlagsBits.ViewChannel] },
    { id: client.user.id, allow: [
      discord.PermissionFlagsBits.ViewChannel,
      discord.PermissionFlagsBits.SendMessages,
      discord.PermissionFlagsBits.ManageChannels,
      discord.PermissionFlagsBits.ManageMessages,
      discord.PermissionFlagsBits.EmbedLinks,
    ]},
  ];
  if (ROLE_ADMIN_ID)      overwrites.push({ id: ROLE_ADMIN_ID,      allow: [discord.PermissionFlagsBits.ViewChannel, discord.PermissionFlagsBits.SendMessages, discord.PermissionFlagsBits.ManageMessages] });
  if (ROLE_RAIDLEAD_ID)   overwrites.push({ id: ROLE_RAIDLEAD_ID,   allow: [discord.PermissionFlagsBits.ViewChannel, discord.PermissionFlagsBits.SendMessages, discord.PermissionFlagsBits.ManageMessages] });
  if (ROLE_BOOSTER_ID)    overwrites.push({ id: ROLE_BOOSTER_ID,    allow: [discord.PermissionFlagsBits.ViewChannel, discord.PermissionFlagsBits.SendMessages] });
  if (ROLE_LOOTBUDDYS_ID) overwrites.push({ id: ROLE_LOOTBUDDYS_ID, allow: [discord.PermissionFlagsBits.ViewChannel, discord.PermissionFlagsBits.SendMessages] });

  const ch = await guild.channels.create({
    name: channelNameFromRaid(raid),
    type: discord.ChannelType.GuildText,     // ✅ richtige Verwendung (kein Promise!)
    parent: CAT_ID || undefined,             // Kategorie
    permissionOverwrites: overwrites,
    reason: `Raid #${raid.id} erstellt`,
  });

  // in DB zurückschreiben
  await prisma.raid.update({ where: { id: raid.id }, data: { channelId: ch.id } });
  return ch;
}

module.exports = { ensureChannel, channelNameFromRaid };

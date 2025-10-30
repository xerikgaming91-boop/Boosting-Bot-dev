// src/backend/discord-bot/modules/raids/rosterPost.js
/**
 * Postet das geplante Roster (status = 'picked') in den Raid-Channel.
 * Jede Zeile: "<Klassen-Icon> <@discordId>"
 * -> Klassen-Icon zeigt die Klasse, <@id> pingt den User und zeigt den Server-Displaynamen.
 * Keine Rollen, kein zusätzlicher content-Text.
 */
const { prisma } = require("../../../prismaClient.js");
const { getClient } = require("../../core/client.js");
const { ensureChannel } = require("./channel.js");

const GUILD_ID = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || "";

/** Unicode-Emojis für Klassen (robust, funktioniert ohne Custom-Emojis) */
const CLASS_EMOJI = {
  dk: "☠️",
  deathknight: "☠️",
  dh: "😈",
  demonhunter: "😈",
  druid: "🐉",       // (alternativ 🐻, aber 🐉 passt auch zu Balance/Feral)
  hunter: "🏹",
  mage: "✨",
  monk: "🥋",
  paladin: "🛡️",
  priest: "🕊️",
  rogue: "🗡️",
  shaman: "⚡",
  warlock: "🔮",
  warrior: "⚔️",
  evoker: "🐉",
};

function normClassKey(v) {
  const k = (v || "").toString().trim().toLowerCase().replace(/\s+/g, "");
  if (k === "deathknight") return "dk";
  if (k === "demonhunter") return "dh";
  return k;
}

/** robust das Discord-ID Feld aus einem Signup holen */
function getDiscordIdFromSignup(s) {
  if (s?.user?.discordId) return String(s.user.discordId);
  if (s?.discordId) return String(s.discordId);
  if (s?.userDiscordId) return String(s.userDiscordId);
  if (s?.member?.discordId) return String(s.member.discordId);
  return null;
}

/** Zeile: "• <classIcon> <@id>" (Fallback ohne Ping, falls keine discordId) */
function lineForSignup(s) {
  const c = s.char || {};
  const klassKey = normClassKey(c.class || s.class || "");
  const classIcon = CLASS_EMOJI[klassKey] || "•";

  const discordId = getDiscordIdFromSignup(s);
  const mention = discordId
    ? `<@${discordId}>`
    : (s.displayName || s.user?.displayName || s.user?.username || "Unbekannt");

  return `${classIcon} ${mention}`;
}

function buildRosterEmbed(raid, picked) {
  const groups = { TANK: [], HEALER: [], DPS: [], LOOT: [] };

  for (const s of picked) {
    const roleRaw = String(s.type || "").toUpperCase();
    const role =
      roleRaw === "HEAL" ? "HEALER"
      : roleRaw === "LOOTBUDDY" ? "LOOT"
      : roleRaw || "DPS";

    const line = lineForSignup(s);
    if (role === "TANK") groups.TANK.push(line);
    else if (role === "HEALER") groups.HEALER.push(line);
    else if (role === "DPS") groups.DPS.push(line);
    else groups.LOOT.push(line);
  }

  const fields = [
    { name: `🛡️ Tanks (${groups.TANK.length})`,   value: groups.TANK.length ? groups.TANK.join("\n") : "—", inline: false },
    { name: `💚 Heiler (${groups.HEALER.length})`, value: groups.HEALER.length ? groups.HEALER.join("\n") : "—", inline: false },
    { name: `⚔️ DPS (${groups.DPS.length})`,       value: groups.DPS.length ? groups.DPS.join("\n") : "—", inline: false },
    { name: `🎒 Lootbuddies (${groups.LOOT.length})`, value: groups.LOOT.length ? groups.LOOT.join("\n") : "—", inline: false },
  ];

  const title = raid?.title ? `${raid.title} — Roster (${picked.length})` : `Roster (${picked.length})`;

  return {
    embeds: [
      {
        title,
        fields,
        color: 0xff7f00, // Phoenix-Orange
        footer: { text: `RID:${raid?.id ?? "-"}` },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Postet das Roster (STATUS ∈ {'picked','PICKED','Picked'}) in den Channel.
 * Mentions stehen im Embed-Text; allowedMentions auf genau diese IDs beschränkt.
 */
async function postRosterMessage(raidOrId) {
  const ctx = await getClient();
  if (ctx.inactive) throw new Error("Discord-Bot inaktiv (kein Token gesetzt).");

  // Raid laden (falls nur ID übergeben)
  const raid = typeof raidOrId === "object"
    ? raidOrId
    : await prisma.raid.findUnique({ where: { id: Number(raidOrId) } });
  if (!raid) throw new Error("Raid nicht gefunden.");

  // Geplantes Roster: status in ['picked','PICKED','Picked']
  const picked = await prisma.signup.findMany({
    where: {
      raidId: raid.id,
      status: { in: ["picked", "PICKED", "Picked"] },
    },
    include: {
      char: {
        select: { name: true, realm: true, class: true, itemLevel: true, spec: true, wclUrl: true },
      },
      user: {
        select: { discordId: true, displayName: true, username: true },
      },
    },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  const channel = await ensureChannel(raid);
  if (!channel) throw new Error("Channel konnte nicht bestimmt/erstellt werden.");

  const payload = buildRosterEmbed(raid, picked);

  // IDs, die wir IM Embed erwähnen, müssen hier erlaubt werden
  const discordIds = Array.from(new Set(picked.map(getDiscordIdFromSignup).filter(Boolean)));

  const msg = await channel.send({
    embeds: payload.embeds, // Mentions stehen in den Embed-Feldern
    allowedMentions: {
      users: discordIds, // nur diese User darf Discord real mentionen
      roles: [],         // keine Rollen
      parse: [],         // keine Auto-Parser (@everyone, roles, users)
    },
  });

  const guildId = GUILD_ID || channel.guildId || "";
  const url = guildId ? `https://discord.com/channels/${guildId}/${channel.id}/${msg.id}` : msg.url;
  return { messageUrl: url, messageId: msg.id, channelId: channel.id };
}

module.exports = { postRosterMessage };

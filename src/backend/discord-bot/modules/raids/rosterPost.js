// src/backend/discord-bot/modules/raids/rosterPost.js
/**
 * Postet das geplante Roster (status ∈ {'picked','PICKED','Picked'}) als
 * einfache Text-Nachricht (KEIN Embed).
 *
 * Format:
 * **Current Roster (N)** (Tx 🛡️ | Hx 💚 | Dx ⚔️ | Lx 👜)
 *
 * 🛡️
 * 1. <@ID> 🗡️
 * 2. <@ID> ⚔️
 * ...
 *
 * 💚
 * 1. <@ID> ⚡
 * ...
 *
 * Lootbuddy
 *
 * 👜
 * 1. <@ID> ✨
 * ...
 *
 * - Echte Mentions über <@id> -> erzeugen Ping + zeigen Server-Displayname (blau)
 * - allowedMentions.users begrenzt Mentions genau auf die IDs aus dem Roster
 * - Fallback falls kein discordId vorhanden: Name ohne Ping (kein @)
 */
const { prisma } = require("../../../prismaClient.js");
const { getClient } = require("../../core/client.js");
const { ensureChannel } = require("./channel.js");

const GUILD_ID = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || "";

/** Unicode-Icons für Klassen (robust, keine Guild-Emojis nötig) */
const CLASS_EMOJI = {
  dk: "☠️", deathknight: "☠️",
  dh: "😈", demonhunter: "😈",
  druid: "🐻",
  evoker: "🐉",
  hunter: "🏹",
  mage: "✨",
  monk: "🥋",
  paladin: "🛡️",
  priest: "🕊️",
  rogue: "🗡️",
  shaman: "⚡",
  warlock: "🔮",
  warrior: "⚔️",
};

function normClassKey(v) {
  const k = (v || "").toString().trim().toLowerCase().replace(/\s+/g, "");
  if (k === "deathknight") return "dk";
  if (k === "demonhunter") return "dh";
  return k;
}

/** Discord-ID robust aus Signup ziehen */
function getDiscordIdFromSignup(s) {
  if (s?.user?.discordId) return String(s.user.discordId);
  if (s?.discordId) return String(s.discordId);
  if (s?.userDiscordId) return String(s.userDiscordId);
  if (s?.member?.discordId) return String(s.member.discordId);
  return null;
}

/** Sichtbarer Name ohne Ping (z. B. wenn kein discordId vorhanden) */
function fallbackName(s) {
  return (
    s?.user?.displayName ||
    s?.displayName ||
    s?.user?.username ||
    (() => {
      const c = s?.char || {};
      if (c?.name) return `${c.name}${c.realm ? "-" + c.realm : ""}`;
      return s?.charName || s?.name || "Unbekannt";
    })()
  ).replaceAll("@", "@\u200B"); // Sicherheitsentwertung, falls @ im Namen
}

function groupSignups(picked) {
  return picked.reduce(
    (acc, s) => {
      const roleRaw = String(s.type || "").toUpperCase();
      const role =
        roleRaw === "TANK" ? "TANK" :
        roleRaw === "HEAL" || roleRaw === "HEALER" ? "HEALER" :
        roleRaw === "LOOTBUDDY" ? "LOOT" :
        "DPS";
      acc[role].push(s);
      return acc;
    },
    { TANK: [], HEALER: [], DPS: [], LOOT: [] }
  );
}

/** Nummerierten Block für eine Rolle bauen (mit echten Mentions) */
function buildRoleBlock(labelEmoji, items) {
  const lines = [];
  lines.push(`${labelEmoji}`);
  if (!items.length) {
    lines.push("–");
    return lines.join("\n");
  }
  items.forEach((s, i) => {
    const c = s.char || {};
    const klassKey = normClassKey(c.class || s.class || "");
    const classIcon = CLASS_EMOJI[klassKey] || "•";

    const id = getDiscordIdFromSignup(s);
    const who = id ? `<@${id}>` : fallbackName(s); // mention oder Text

    lines.push(`${i + 1}. ${who} ${classIcon}`);
  });
  return lines.join("\n");
}

/** Gesamtnachricht bauen (2000-Char-Limit beachten) */
function buildPlainText(raid, picked) {
  const groups = groupSignups(picked);
  const t = groups.TANK.length, h = groups.HEALER.length, d = groups.DPS.length, l = groups.LOOT.length;
  const total = picked.length;

  const headerTitle = `**Current Roster (${total})** (${t}x 🛡️ | ${h}x 💚 | ${d}x ⚔️ | ${l}x 👜)`;
  const blocks = [
    buildRoleBlock("🛡️", groups.TANK),
    "",
    buildRoleBlock("💚", groups.HEALER),
    "",
    buildRoleBlock("⚔️", groups.DPS),
    "",
    "Lootbuddy",
    "",
    buildRoleBlock("👜", groups.LOOT),
  ];

  return [headerTitle, "", ...blocks].join("\n");
}

/** Split in mehrere Nachrichten, falls >2000 Zeichen (Discord-Limit) */
function chunkMessage(text, max = 1900) {
  if (text.length <= 2000) return [text];
  const lines = text.split("\n");
  const chunks = [];
  let buf = "";
  for (const ln of lines) {
    if ((buf + (buf ? "\n" : "") + ln).length > max) {
      if (buf) chunks.push(buf);
      buf = ln;
    } else {
      buf += (buf ? "\n" : "") + ln;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

/**
 * Postet den Roster-Text mit echten Mentions.
 */
async function postRosterMessage(raidOrId) {
  const ctx = await getClient();
  if (ctx.inactive) throw new Error("Discord-Bot inaktiv (kein Token gesetzt).");

  const raid = typeof raidOrId === "object"
    ? raidOrId
    : await prisma.raid.findUnique({ where: { id: Number(raidOrId) } });
  if (!raid) throw new Error("Raid nicht gefunden.");

  // Geplantes Roster: status ∈ ['picked','PICKED','Picked']
  const picked = await prisma.signup.findMany({
    where: {
      raidId: raid.id,
      status: { in: ["picked", "PICKED", "Picked"] },
    },
    include: {
      char: { select: { name: true, realm: true, class: true } },
      user: { select: { discordId: true, displayName: true, username: true } },
    },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  const channel = await ensureChannel(raid);
  if (!channel) throw new Error("Channel konnte nicht bestimmt/erstellt werden.");

  const content = buildPlainText(raid, picked);

  // Erlaubte Mention-IDs (nur die, die wir tatsächlich im Text nutzen können)
  const mentionIds = Array.from(
    new Set(
      picked.map(getDiscordIdFromSignup).filter(Boolean)
    )
  );

  // ggf. in mehrere Nachrichten aufsplitten
  const chunks = chunkMessage(content);

  let lastMsg = null;
  for (let i = 0; i < chunks.length; i++) {
    const part = chunks[i];
    lastMsg = await channel.send({
      content: part,
      allowedMentions: {
        users: mentionIds,   // nur diese User dürfen gepingt werden
        roles: [],           // keine Rollen-Pings
        parse: [],           // kein @everyone/@here
        repliedUser: false,
      },
    });
  }

  const guildId = GUILD_ID || channel.guildId || "";
  const url = lastMsg
    ? (guildId ? `https://discord.com/channels/${guildId}/${channel.id}/${lastMsg.id}` : lastMsg.url)
    : "";

  return { messageUrl: url, messageId: lastMsg?.id || "", channelId: channel.id };
}

module.exports = { postRosterMessage };

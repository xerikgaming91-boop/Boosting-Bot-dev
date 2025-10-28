// src/backend/services/rosterPostService.js
// Baut einen Discord-Text fürs Roster (mit Mentions) und postet/editiert die Nachricht im Raid-Channel.

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const tz = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(tz);

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Wir greifen direkt auf den aktiven Bot-Client zu.
// Die Bot-Implementierung exportiert i.d.R. entweder getClient() oder client.
function getDiscordClient() {
  // Prefer direct bot; fallback zu altem Wrapper (Compat)
  let bot = null;
  try {
    bot = require("../discord-bot");
  } catch {}
  if (!bot) {
    try {
      bot = require("../services/DiscordService"); // DEPRECATED-Wrapper
    } catch {}
  }
  if (!bot) throw new Error("Discord-Bot-Modul nicht gefunden");

  const client = bot.getClient ? bot.getClient() : bot.client || bot;
  if (!client) throw new Error("Discord-Client nicht initialisiert");
  return client;
}

// --- Hilfsfunktionen ------------------------------------------------------

function normalizeType(t) {
  if (!t) return "dps";
  const s = String(t).toUpperCase();
  if (s.startsWith("TANK")) return "tank";
  if (s.startsWith("HEAL")) return "heal";
  if (s.startsWith("LOOT")) return "loot";
  return "dps";
}

function sortByIlvlThenName(a, b) {
  const ai = a.itemLevel ?? -1;
  const bi = b.itemLevel ?? -1;
  if (ai !== bi) return bi - ai;
  return String(a.who || "").localeCompare(String(b.who || ""), "de");
}

function fmtDate(date) {
  try {
    return dayjs(date).tz("Europe/Berlin").format("ddd, DD.MM. HH:mm");
  } catch {
    return new Date(date).toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  }
}

// Baut je Zeile z.B. "• <@123> — Synblast-Antonidas (Shaman • 716 ilvl)"
function buildLine(s) {
  const who = s.userId ? `<@${s.userId}>` : (s.who || "-");
  const char = s.charName && s.charRealm ? `${s.charName}-${s.charRealm}` : (s.charName || s.who || "");
  const cls = s.classLabel || s.class || "";
  const ilvl = s.itemLevel ? ` • ${s.itemLevel} ilvl` : "";
  return `• ${who}${char ? ` — ${char}` : ""}${cls ? ` (${cls}${ilvl})` : `${ilvl}`}`;
}

function buildRosterText(raid, grouped) {
  const head = [
    `**${raid.title}**`,
    `Datum: ${fmtDate(raid.date)}  •  Diff: ${raid.difficulty}  •  Loot: ${raid.lootType.toUpperCase()}`,
    raid.lead ? `Lead: <@${raid.lead}>` : null,
  ].filter(Boolean);

  const blocks = [];
  const pushBlock = (title, list) => {
    if (!list || list.length === 0) {
      blocks.push(`**${title}**\n• –`);
      return;
    }
    blocks.push(`**${title}**\n${list.map(buildLine).join("\n")}`);
  };

  pushBlock("🛡️ Tanks",     grouped.tank);
  pushBlock("💚 Heiler",     grouped.heal);
  pushBlock("⚔️ DPS",        grouped.dps);
  pushBlock("💼 Lootbuddys", grouped.loot);

  return head.join("\n") + "\n\n" + blocks.join("\n\n");
}

// Gruppiert die Picks aus der DB
function groupPicked(rows) {
  const g = { tank: [], heal: [], dps: [], loot: [] };
  for (const r of rows) {
    const item = {
      id: r.id,
      userId: r.userId || null,
      who: r.displayName || r.user?.displayName || r.user?.username || null,
      class: r.class || r.char?.class || null,
      classLabel: r.class || r.char?.class || null,
      itemLevel: r.char?.itemLevel ?? null,
      charName: r.char?.name || null,
      charRealm: r.char?.realm || null,
    };
    g[normalizeType(r.type)].push(item);
  }
  g.tank.sort(sortByIlvlThenName);
  g.heal.sort(sortByIlvlThenName);
  g.dps.sort(sortByIlvlThenName);
  g.loot.sort(sortByIlvlThenName);
  return g;
}

// Liefert Liste der zu erwähnenden User-IDs (für allowedMentions)
function collectMentionUserIds(grouped) {
  const ids = new Set();
  ["tank", "heal", "dps", "loot"].forEach((k) => {
    for (const s of grouped[k] || []) {
      if (s.userId) ids.add(s.userId);
    }
  });
  return Array.from(ids);
}

// --- Hauptfunktion --------------------------------------------------------

/**
 * Postet (oder editiert) die Roster-Nachricht im Raid-Channel.
 * Falls raid.messageId gesetzt ist, wird editiert. Ansonsten neu gepostet und gespeichert.
 */
async function postRoster(raidId, { forceNew = false } = {}) {
  // Raid + Picks ziehen
  const raid = await prisma.raid.findUnique({
    where: { id: Number(raidId) },
    select: {
      id: true,
      title: true,
      difficulty: true,
      lootType: true,
      date: true,
      lead: true,
      channelId: true,
      messageId: true,
    },
  });

  if (!raid) throw new Error("Raid nicht gefunden");
  if (!raid.channelId) throw new Error("Raid.channelId fehlt – Channel wurde evtl. nicht angelegt");

  const picks = await prisma.signup.findMany({
    where: { raidId: raid.id, status: "PICKED" },
    include: {
      user: true,
      char: true,
      raid: false,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const grouped = groupPicked(picks);
  const text = buildRosterText(raid, grouped);
  const mentionIds = collectMentionUserIds(grouped);

  const client = getDiscordClient();
  const channel = await client.channels.fetch(raid.channelId);
  if (!channel || !channel.send) throw new Error("Discord-Channel nicht sendbar");

  let message = null;

  if (!forceNew && raid.messageId) {
    try {
      const existing = await channel.messages.fetch(raid.messageId);
      message = await existing.edit({
        content: text,
        allowedMentions: { users: mentionIds, parse: [] },
      });
    } catch (e) {
      // Fallback → neu posten
      message = await channel.send({
        content: text,
        allowedMentions: { users: mentionIds, parse: [] },
      });
    }
  } else {
    message = await channel.send({
      content: text,
      allowedMentions: { users: mentionIds, parse: [] },
    });
  }

  // messageId persistieren (nur wenn neu)
  if (message && message.id && message.id !== raid.messageId) {
    await prisma.raid.update({
      where: { id: raid.id },
      data: { messageId: message.id },
    });
  }

  return {
    channelId: raid.channelId,
    messageId: message?.id || raid.messageId,
    postedAt: new Date().toISOString(),
    counts: {
      tanks: grouped.tank.length,
      heals: grouped.heal.length,
      dps: grouped.dps.length,
      loot: grouped.loot.length,
    },
    preview: text, // nützlich fürs Debuggen im Frontend
  };
}

module.exports = {
  postRoster,
};

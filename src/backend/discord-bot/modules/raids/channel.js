// src/backend/discord-bot/modules/raids/channel.js
const { getClient } = require("../../core/client.js");
const { prisma }    = require("../../../prismaClient.js");

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CAT_ID   = process.env.DISCORD_RAID_CATEGORY_ID;

const ROLE_ADMIN_ID      = process.env.DISCORD_ROLE_ADMIN_ID;
const ROLE_RAIDLEAD_ID   = process.env.RAIDLEAD_ROLE_ID;
const ROLE_BOOSTER_ID    = process.env.DISCORD_ROLE_BOOSTER_ID;
const ROLE_LOOTBUDDYS_ID = process.env.DISCORD_ROLE_LOOTBUDDYS_ID;

// Immer loggen
const LOG = (...a) => console.log("[raid:channel]", ...a);

/* ============================== Helpers ============================== */

function slug(v) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
function looksLikeSnowflake(x) { return /^\d{16,22}$/.test(String(x ?? "")); }

function isUsableName(x) {
  if (x == null) return false;
  const s = String(x).trim();
  if (!s) return false;
  if (s === "0") return false;
  if (looksLikeSnowflake(s)) return false;
  return true;
}

function dowAbbrEU(date) {
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Berlin" });
  return String(fmt.format(date) || "").slice(0, 3).toLowerCase();
}
function timeHHmmEU(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Berlin",
  }).formatToParts(date);
  const hh = parts.find(p => p.type === "hour")?.value ?? "00";
  const mm = parts.find(p => p.type === "minute")?.value ?? "00";
  return `${hh}${mm}`;
}
function diffAbbr(diff) {
  const v = String(diff || "").toLowerCase();
  if (["heroic","hc","h"].includes(v)) return "hc";
  if (["mythic","m","myth"].includes(v)) return "m";
  if (["normal","nm","n"].includes(v)) return "nm";
  return slug(v) || "nm";
}
function lootSlug(lootType) { return slug(lootType) || "vip"; }

/* ======================= Lead-Name ermitteln ======================= */

function pickLeadId(raid) {
  const id =
    [raid.leadDiscordId, raid.leadId, raid.leadUserId, raid.lead]
      .map(v => (v == null ? null : String(v)))
      .find(looksLikeSnowflake) || null;

  LOG("lead-id candidates:", {
    leadDiscordId: raid.leadDiscordId,
    leadId: raid.leadId,
    leadUserId: raid.leadUserId,
    lead: raid.lead,
    chosen: id
  });
  return id;
}

function resolveLeadReadableFromRaidFields(raid, override) {
  let overrideName = null;
  if (typeof override === "string") overrideName = override.trim();
  else if (override && typeof override === "object") {
    overrideName = (override.leadName ?? override.leadDisplayName ?? override.lead ?? "").trim();
  }

  const raw = [
    overrideName,
    raid.leadDisplayName,
    raid.leadName,
    raid.leadLabel,
    raid.leadDiscordTag ? String(raid.leadDiscordTag).split("#")[0] : null,
    raid.leadUsername,
    (raid.lead && !looksLikeSnowflake(raid.lead)) ? String(raid.lead) : null,
  ];
  LOG("lead candidates RAW:", raw);

  const filtered = raw.filter(isUsableName).map(s => String(s).trim());
  const chosen = filtered[0] || null;
  LOG("lead candidates FILTERED:", filtered, "→ chosen:", chosen);
  return chosen;
}

async function resolveLeadNameFromId(id, guild, client) {
  try {
    const row = await prisma.user.findUnique({
      where: { discordId: id },
      select: { displayName: true, username: true },
    });
    if (row) {
      const dn = row.displayName || row.username || null;
      LOG("DB user resolved:", row, "→", dn);
      if (isUsableName(dn)) return dn;
    } else {
      LOG("DB user not found for id:", id);
    }
  } catch (e) { LOG("DB lookup error:", e?.message || e); }

  try {
    const m = await guild.members.fetch(id);
    const nick = m?.displayName || m?.user?.globalName || m?.user?.username || null;
    LOG("guild.members.fetch resolved:", nick);
    if (isUsableName(nick)) return nick;
  } catch (e) { LOG("guild.members.fetch failed:", e?.message || e); }

  try {
    const u = await client.users.fetch(id);
    const name = u?.globalName || u?.username || null;
    LOG("client.users.fetch resolved:", name);
    if (isUsableName(name)) return name;
  } catch (e) { LOG("client.users.fetch failed:", e?.message || e); }

  LOG("no readable name resolved from id:", id);
  return null;
}

async function resolveLeadReadable(raid, guild, client, override) {
  const direct = resolveLeadReadableFromRaidFields(raid, override);
  if (direct) return direct;

  const id = pickLeadId(raid);
  if (!id) return null;

  return await resolveLeadNameFromId(id, guild, client);
}

/* =============== Channelname final zusammenbauen =============== */
function buildFinalChannelName(raid, leadReadable, ctx = "default") {
  const dt   = new Date(raid.date || Date.now());
  const day  = dowAbbrEU(dt);
  const hm   = timeHHmmEU(dt);
  const diff = diffAbbr(raid.difficulty);
  const loot = lootSlug(raid.lootType);

  const suffix = isUsableName(leadReadable) ? slug(leadReadable) : "";
  const base   = `${day}-${hm}-${diff}-${loot}`;
  const name   = suffix ? `${base}-${suffix}` : base;

  LOG(`channel name parts [${ctx}]:`, { day, hm, diff, loot, suffix, final: name });
  return slug(name);
}

/* ======================== öffentliche API ======================== */
/**
 * Sync-Helfer, den andere Module gerne aufrufen:
 *  - nutzt **raid.leadDisplayName**, das wir in ensureChannel setzen
 *  - wenn leer → lesbare Fallbacks (keine ID)
 *  - wenn weiterhin leer, loggen wir eine Warnung + Stacktrace
 */
function channelNameFromRaid(raid) {
  const leadReadable = resolveLeadReadableFromRaidFields(raid /* no override */);
  const name = buildFinalChannelName(raid, leadReadable, "channelNameFromRaid");
  if (!leadReadable) {
    console.warn("[raid:channel] WARN: channelNameFromRaid() ohne Lead-Suffix aufgerufen. Call stack:");
    console.trace();
  }
  return name;
}

/* ============================= Main ============================== */
/**
 * Erstellt den Channel (ohne Embed) und speichert die channelId.
 * Optionaler 2. Param 'leadOverride' kann den exakten Embed-Namen liefern.
 * WICHTIG: Wir schreiben den ermittelten Namen **in raid.leadDisplayName**,
 * damit spätere Aufrufer von channelNameFromRaid(raid) denselben Suffix bekommen.
 */
async function ensureChannel(raid, leadOverride) {
  const { client, discord, inactive } = await getClient();
  if (inactive) return null;
  if (!GUILD_ID) throw new Error("DISCORD_BOT: DISCORD_GUILD_ID fehlt");

  LOG("ensureChannel:start", {
    raidId: raid.id, title: raid.title, date: raid.date,
    difficulty: raid.difficulty, lootType: raid.lootType, channelId: raid.channelId || null,
    leadOverride,
    leadFields: {
      leadDisplayName: raid.leadDisplayName, leadName: raid.leadName, leadLabel: raid.leadLabel,
      leadDiscordTag: raid.leadDiscordTag, leadUsername: raid.leadUsername,
      leadDiscordId: raid.leadDiscordId, leadId: raid.leadId, leadUserId: raid.leadUserId, lead: raid.lead,
    },
  });

  const guild = await client.guilds.fetch(GUILD_ID);

  // 1) vorhandenen Channel wiederverwenden
  if (raid.channelId) {
    try {
      const existing = await guild.channels.fetch(raid.channelId);
      if (existing) {
        LOG("channel exists:", { id: raid.channelId, name: existing?.name });
        return existing;
      }
    } catch (e) { LOG("fetch existing failed → create new:", e?.message || e); }
  }

  // 2) Lead-Name bestimmen
  const leadReadable = await resolveLeadReadable(raid, guild, client, leadOverride);
  LOG("leadReadable (final):", leadReadable);

  // 2a) **WICHTIG**: in das Raid-Objekt schreiben → spätere Calls sehen denselben Namen
  if (isUsableName(leadReadable)) {
    raid.leadDisplayName = leadReadable;
  }

  // 3) finalen Channelnamen bauen
  const finalName = buildFinalChannelName(raid, leadReadable, "ensureChannel");
  LOG("final channel name:", finalName);

  // 4) Permissions
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

  // 5) Channel erstellen (hier KEIN Embed posten)
  const ch = await guild.channels.create({
    name: finalName,
    type: discord.ChannelType.GuildText,
    parent: CAT_ID || undefined,
    permissionOverwrites: overwrites,
    reason: `Raid #${raid.id} erstellt`,
  });
  LOG("channel created:", { id: ch.id, name: ch.name });

  // 6) Channel-ID speichern
  await prisma.raid.update({ where: { id: raid.id }, data: { channelId: ch.id } });
  LOG("channelId persisted:", ch.id);

  return ch;
}

/**
 * Erzwingt den gewünschten Channelnamen (falls ein anderer Code ihn ändert).
 * - leadOverride: derselbe String wie im Embed (optional)
 */
async function ensureChannelName(raid, leadOverride) {
  const { client } = await getClient();
  if (!raid?.channelId) { LOG("ensureChannelName skipped: no channelId on raid"); return null; }

  const guild = await client.guilds.fetch(GUILD_ID);
  const ch = await guild.channels.fetch(raid.channelId).catch(() => null);
  if (!ch) { LOG("ensureChannelName: channel not found for", raid.channelId); return null; }

  // gewünschten Namen erneut bestimmen
  const desiredLead = await resolveLeadReadable(raid, guild, client, leadOverride);
  if (isUsableName(desiredLead)) raid.leadDisplayName = desiredLead; // für nachfolgende Sync-Calls

  const desiredName = buildFinalChannelName(raid, desiredLead, "ensureChannelName");
  if (ch.name !== desiredName) {
    LOG(`ensureChannelName: rename '${ch.name}' → '${desiredName}'`);
    await ch.setName(desiredName, "enforce channel naming convention");
  } else {
    LOG("ensureChannelName: already correct:", desiredName);
  }
  return ch;
}

module.exports = {
  ensureChannel,
  ensureChannelName,
  channelNameFromRaid, // nutzt raid.leadDisplayName (das wir jetzt setzen)
};

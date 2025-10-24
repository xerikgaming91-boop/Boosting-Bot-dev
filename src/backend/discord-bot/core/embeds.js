// src/backend/discord-bot/core/embeds.js

function fmtDate(d) {
  try {
    const t = Math.floor(new Date(d).getTime() / 1000);
    return `<t:${t}:F>`;
  } catch { return "-"; }
}
function up(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

function mkHeaderEmbed(raid, leadDisplayName) {
  const { title, difficulty, lootType, date, bosses = 8 } = raid || {};
  return {
    title: title || "Raid",
    description: [
      "Anmeldungen über Website / Buttons",
      "",
      `**Datum**       ${fmtDate(date)}`,
      `**Raid Leader** ${leadDisplayName ? leadDisplayName : "-"}`,
      `**Loot Type**   ${up(lootType) || "-"}`,
    ].join("\n"),
    color: 0x00b894,
    footer: { text: `RID:${raid?.id ?? "-"}` },
    timestamp: new Date().toISOString(),
  };
}

function renderRoleLine(label, items) {
  const v = items?.length ? items.join(", ") : "keine";
  return `**${label}** ${v}`;
}

function groupLines(signups) {
  const tanks = [];
  const heals = [];
  const dps   = [];
  const loots = [];

  for (const s of signups) {
    const name = s.char?.name
      ? `${s.char.name}${s.char.realm ? "-" + s.char.realm : ""}`
      : (s.displayName || s.userId);

    const klass = s.char?.class || s.class || "";
    const role  = (s.type || "").toUpperCase();

    const label = klass ? `${name} (${klass})` : name;

    if (role === "TANK") tanks.push(label);
    else if (role === "HEAL" || role === "HEALER") heals.push(label);
    else if (role === "LOOTBUDDY") loots.push(label);
    else dps.push(label);
  }

  return [
    renderRoleLine("🛡️ Tanks", tanks),
    renderRoleLine("💚 Healers", heals),
    renderRoleLine("🗡️ DPS", dps),
    renderRoleLine("🍀 Lootbuddys", loots),
  ];
}

function mkRosterEmbed(raid, savedSignups) {
  const lines = groupLines(savedSignups);
  return {
    title: `Roster (${savedSignups.length})`,
    description: `${lines.join("\n")}\n\nRID:${raid?.id ?? "-"}`,
    color: 0x0984e3,
  };
}

function mkSignupsEmbed(raid, pendingSignups) {
  const lines = groupLines(pendingSignups);
  return {
    title: `Signups (${pendingSignups.length})`,
    description: `${lines.join("\n")}\n\nRID:${raid?.id ?? "-"}`,
    color: 0x636e72,
  };
}

/**
 * Baut ALLE Embeds (Header + Roster + Signups)
 */
function buildRaidEmbeds(raid, allSignups, leadDisplayName) {
  const saved   = allSignups.filter(s => !!s.saved);
  const pending = allSignups.filter(s => !s.saved);

  return {
    embeds: [
      mkHeaderEmbed(raid, leadDisplayName),
      mkRosterEmbed(raid, saved),
      mkSignupsEmbed(raid, pending),
    ],
  };
}

module.exports = { buildRaidEmbeds };

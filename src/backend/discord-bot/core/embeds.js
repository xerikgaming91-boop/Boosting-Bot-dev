// src/backend/discord-bot/core/embeds.js

function fmtDate(d) {
  try {
    const t = Math.floor(new Date(d).getTime() / 1000);
    return `<t:${t}:F>`;
  } catch { return "-"; }
}
function up(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

function roleKey(type) {
  const v = String(type || "").toLowerCase();
  if (v.startsWith("tank")) return "tanks";
  if (v.startsWith("heal")) return "heals";
  if (v.startsWith("dps")) return "dps";
  if (v.startsWith("loot")) return "loot";
  return "dps";
}
function countByRole(list) {
  const c = { tanks: 0, heals: 0, dps: 0, loot: 0 };
  (Array.isArray(list) ? list : []).forEach((s) => {
    const k = roleKey(s?.type || s?.role || s?.class);
    c[k] += 1;
  });
  return c;
}
function toSlots(preset) {
  if (!preset) return null;
  const n = (x) => (x == null ? null : Number(x));
  return {
    name: preset.name || preset.title || "",
    tanks: n(preset.tanks) ?? n(preset.tank) ?? n(preset.numTanks) ?? 0,
    heals: n(preset.heals) ?? n(preset.healer) ?? n(preset.numHeals) ?? 0,
    dps:   n(preset.dps)   ?? n(preset.numDps) ?? 0,
    loot:  n(preset.loot)  ?? null, // null = ∞
  };
}

function mkHeaderEmbed(raid, leadDisplayName, allSignups) {
  const { title, difficulty, lootType, date, bosses = 8 } = raid || {};

  // Preset
  const slots = toSlots(raid?.preset || raid?.presetSlots || null);
  const counts = countByRole(allSignups || []);

  const presetLine = slots
    ? `\n**Preset:** 🛡️ ${counts.tanks}/${slots.tanks}  •  ✚ ${counts.heals}/${slots.heals}  •  🗡️ ${counts.dps}/${slots.dps}  •  🍀 ${counts.loot}/${slots.loot != null ? slots.loot : "∞"}`
    : "";

  return {
    title: title || "Raid",
    description: [
      "Anmeldungen über Website / Buttons",
      "",
      `**Datum:** ${fmtDate(date)}`,
      `**Difficulty:** ${up(String(difficulty || ""))}`,
      `**Loot:** ${up(String(lootType || ""))}`,
      `**Bosses:** ${Number.isFinite(Number(bosses)) ? bosses : "-"}`,
      `**Lead:** ${leadDisplayName || "-"}`,
      presetLine,
    ].filter(Boolean).join("\n"),
    color: 0xffc107,
  };
}

/* ------- Roster & Signups (bestehend) ------- */
function renderRoleLine(label, arr) {
  if (!arr?.length) return `${label}: –`;
  return `${label}: ${arr.map(s => s.who || s.displayName || s.name).join(", ")}`;
}
function groupLines(list) {
  const tanks = (list || []).filter(s => roleKey(s.role || s.type || s.class) === "tanks");
  const heals = (list || []).filter(s => roleKey(s.role || s.type || s.class) === "heals");
  const dps   = (list || []).filter(s => roleKey(s.role || s.type || s.class) === "dps");
  const loots = (list || []).filter(s => roleKey(s.role || s.type || s.class) === "loot");

  return [
    renderRoleLine("🛡️ Tanks", tanks),
    renderRoleLine("✚ Heals", heals),
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
    title: `Signups (Open) (${pendingSignups.length})`,
    description: `${lines.join("\n")}\n\nRID:${raid?.id ?? "-"}`,
    color: 0x00b894,
  };
}

function buildRaidEmbeds(raid, allSignups, leadDisplayName) {
  const saved   = (allSignups || []).filter(s => !!s.saved);
  const pending = (allSignups || []).filter(s => !s.saved);

  return {
    embeds: [
      mkHeaderEmbed(raid, leadDisplayName, allSignups),
      mkRosterEmbed(raid, saved),
      mkSignupsEmbed(raid, pending),
    ],
  };
}

module.exports = { buildRaidEmbeds };

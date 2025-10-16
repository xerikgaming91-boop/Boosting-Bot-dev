// src/frontend/features/raids/hooks/useRaidBuffs.js
import { useMemo } from "react";

/* Klassenname robust normalisieren */
function normalizeClassName(raw) {
  if (!raw) return "";
  // z.B. "Shaman - HEAL" -> "shaman"
  const base = String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s*[-/|]\s*.*$/, ""); // alles nach " - " / "/" / "|" weg

  const map = {
    dh: "DEMON HUNTER",
    "demon hunter": "DEMON HUNTER",
    demonhunter: "DEMON HUNTER",
    dk: "DEATH KNIGHT",
    "death knight": "DEATH KNIGHT",
    deathknight: "DEATH KNIGHT",
    mage: "MAGE",
    priest: "PRIEST",
    druid: "DRUID",
    warrior: "WARRIOR",
    warlock: "WARLOCK",
    monk: "MONK",
    paladin: "PALADIN",
    shaman: "SHAMAN",
    evoker: "EVOKER",
    hunter: "HUNTER",
    rogue: "ROGUE",
  };
  return map[base] || base.replace(/\b\w/g, (m) => m.toUpperCase());
}

/* Klasse aus Signup/Char-Objekt ziehen */
function extractClass(obj) {
  const val =
    obj?.classLabel ??
    obj?.class ??
    obj?.char?.class ??
    obj?.characterClass ??
    obj?.className ??
    obj?.charClass ??
    null;
  return normalizeClassName(val);
}

/* Nur GEPICKTES Roster flatten – verschiedene Schlüssel abdecken */
function flattenPicked(grouped) {
  if (!grouped) return [];
  const s = grouped.saved || grouped.roster || grouped.planned || {};
  const arrs = [
    s.tanks,
    s.healers,
    s.heals,
    s.dps,
    s.lootbuddies,
    s.loot,
  ].filter(Array.isArray);
  return arrs.flat();
}

/* Buff-Definitionen – Skyfury gehört bei dir zum SHAMAN ✅ */
const BUFFS = [
  { id: "INT",   label: "5% Intellect",           providers: ["MAGE"] },
  { id: "AP",    label: "5% Attack Power",        providers: ["WARRIOR"] },
  { id: "STA",   label: "5% Stamina",             providers: ["PRIEST"] },         // Fortitude
  { id: "PHYS",  label: "5% Physical Damage",     providers: ["MONK"] },           // Mystic Touch
  { id: "MAGIC", label: "5% Magic Damage",        providers: ["DEMON HUNTER"] },   // Chaos Brand
  { id: "DEV",   label: "Devotion Aura",          providers: ["PALADIN"] },
  { id: "VERS",  label: "3% Versatility",         providers: ["DRUID"] },          // Mark of the Wild
  { id: "DR",    label: "3.6% Damage Reduction",  providers: ["PALADIN"] },        // Devo-Effekt
  { id: "HM",    label: "Hunter's Mark",          providers: ["HUNTER"] },
  { id: "SKY",   label: "Skyfury",                providers: ["SHAMAN"] },         // ⬅️ fix
];

/**
 * Zählt Buff-Provider AUSSCHLIESSLICH aus dem gepickten Roster.
 * Gibt ALLE Buffs zurück (fehlende inklusive).
 */
export default function useRaidBuffs({ grouped, roster } = {}) {
  return useMemo(() => {
    const picked = Array.isArray(roster) ? roster : flattenPicked(grouped);

    const classCount = Object.create(null);
    for (const p of picked) {
      const cls = extractClass(p);
      if (!cls) continue;
      classCount[cls] = (classCount[cls] || 0) + 1;
    }

    const list = BUFFS.map((b) => {
      const count = b.providers.reduce((sum, cls) => sum + (classCount[cls] || 0), 0);
      return { id: b.id, label: b.label, count };
    });

    const present = list.filter((x) => x.count > 0);
    const missing = list.filter((x) => x.count === 0);
    return { list, present, missing };
  }, [grouped, roster]);
}

export { BUFFS };

// src/backend/services/raidService.js
// Business-Logik (Validation, Normalisierung, Titelbau)

const raids = require("../models/raidModel.js");
const { prisma } = require("../prismaClient.js");
const { buildRaidTitle } = require("../utils/raidTitle.js");

const VALID_DIFF = new Set(["nhc", "hc", "mythic"]);
const VALID_LOOT = new Set(["saved", "unsaved", "vip"]);

const norm = (v) => String(v ?? "").trim();
const normDiff = (v) => norm(v).toLowerCase();
const normLoot = (v) => norm(v).toLowerCase();

async function list(opts = {}) {
  return raids.findMany(opts);
}

async function getById(id) {
  return raids.findById(id);
}

/**
 * Ableitung des Basis-Dungeonnamens:
 * - client base > presetId.name[first word] > "Manaforge"
 */
async function resolveBase({ base, presetId }) {
  const b = norm(base);
  if (b) return b;

  const pid = presetId == null ? null : Number(presetId);
  if (Number.isFinite(pid)) {
    const preset = await prisma.preset.findUnique({
      where: { id: pid },
      select: { name: true },
    });
    if (preset?.name) {
      const first = preset.name.trim().split(/\s+/)[0];
      if (first) return first;
    }
  }
  return "Manaforge";
}

async function create(input) {
  if (!input) throw new Error("INVALID_PAYLOAD");

  const difficulty = normDiff(input.difficulty);
  const lootType = normLoot(input.lootType);
  if (!VALID_DIFF.has(difficulty)) throw new Error("INVALID_DIFFICULTY");
  if (!VALID_LOOT.has(lootType)) throw new Error("INVALID_LOOT");

  let bosses = 8;
  if (difficulty === "mythic") {
    const b = Number(input.bosses);
    if (!Number.isFinite(b) || b < 1 || b > 8) throw new Error("INVALID_BOSSES");
    bosses = b;
  }

  const when =
    input.date instanceof Date ? input.date : new Date(norm(input.date));
  if (isNaN(when.getTime())) throw new Error("INVALID_DATE");

  const base = await resolveBase({ base: input.base, presetId: input.presetId });
  const title = buildRaidTitle({ base, difficulty, lootType, bosses });

  return raids.create({
    title,
    difficulty,
    lootType,
    bosses,
    date: when,
    lead: norm(input.lead) || null,
    presetId: input.presetId ?? null,
  });
}

async function update(id, patch) {
  const raid = await raids.findById(id);
  if (!raid) throw new Error("NOT_FOUND");

  const data = {};

  if (patch.difficulty != null) {
    const d = normDiff(patch.difficulty);
    if (!VALID_DIFF.has(d)) throw new Error("INVALID_DIFFICULTY");
    data.difficulty = d;
  }
  if (patch.lootType != null) {
    const l = normLoot(patch.lootType);
    if (!VALID_LOOT.has(l)) throw new Error("INVALID_LOOT");
    data.lootType = l;
  }
  if (patch.date != null) {
    const when = patch.date instanceof Date ? patch.date : new Date(norm(patch.date));
    if (isNaN(when.getTime())) throw new Error("INVALID_DATE");
    data.date = when;
  }
  if (patch.lead !== undefined) data.lead = norm(patch.lead) || null;
  if (patch.presetId !== undefined) data.presetId = patch.presetId ?? null;

  // Bosse-Logik
  if (data.difficulty === "mythic" || raid.difficulty === "mythic" || patch.bosses != null) {
    const diff = data.difficulty || raid.difficulty;
    if (diff === "mythic") {
      const b = patch.bosses != null ? Number(patch.bosses) : raid.bosses;
      if (!Number.isFinite(b) || b < 1 || b > 8) throw new Error("INVALID_BOSSES");
      data.bosses = b;
    } else {
      data.bosses = 8;
    }
  }

  // Titel ggf. neu generieren (wenn eine der relevanten Sachen geändert wurde)
  const needTitle =
    data.difficulty != null || data.lootType != null || data.bosses != null || data.presetId !== undefined || patch.base != null;

  if (needTitle) {
    const base = await resolveBase({
      base: patch.base, // optionaler Override
      presetId: data.presetId !== undefined ? data.presetId : raid.presetId,
    });
    const difficulty = data.difficulty || raid.difficulty;
    const lootType = data.lootType || raid.lootType;
    const bosses = data.bosses != null ? data.bosses : raid.bosses;
    data.title = buildRaidTitle({ base, difficulty, lootType, bosses });
  }

  return raids.update(id, data);
}

async function remove(id) {
  return raids.remove(id);
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};

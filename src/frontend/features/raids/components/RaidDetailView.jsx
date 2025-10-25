// src/frontend/features/raids/components/RaidDetailView.jsx
import React from "react";
import { Link } from "react-router-dom";

// --- Rollen- und Status-Icons (RELATIVE Pfade zu src/assets) ---
import roleTank from "/assets/roles/tank.png";
import roleHealer from "/assets/roles/healer.png";
import roleDps from "/assets/roles/dps.png";
import roleLoot from "/assets/roles/loot.png";
import statusSaved from "/assets/roles/saved.png"; // unsaved zeigen wir bewusst nicht

// --- Klassen-Icons (kleiner Ordnername: classes) ---
import ci_deathknight from "/assets/classes/ClassIcon_deathknight.png";
import ci_demon_hunter from "/assets/classes/ClassIcon_demon_hunter.png";
import ci_druid from "/assets/classes/ClassIcon_druid.png";
import ci_evoker from "/assets/classes/ClassIcon_evoker.png";
import ci_hunter from "/assets/classes/ClassIcon_hunter.png";
import ci_mage from "/assets/classes/ClassIcon_mage.png";
import ci_monk from "/assets/classes/ClassIcon_monk.png";
import ci_paladin from "/assets/classes/ClassIcon_paladin.png";
import ci_priest from "./assets/classes/ClassIcon_priest.png";
import ci_rogue from "/assets/classes/ClassIcon_rogue.png";
import ci_shaman from "/assets/classes/ClassIcon_shaman.png";
import ci_warlock from "../../../../assets/classes/ClassIcon_warlock.png";
import ci_warrior from "../../../../assets/classes/ClassIcon_warrior.png";

function Section({ title, children, right }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

const ROLE_ICON_SRC = {
  tanks: roleTank,
  heals: roleHealer,
  dps: roleDps,
  loot: roleLoot,
};

const CLASS_ICON_SRC = {
  deathknight: ci_deathknight,
  "death knight": ci_deathknight,
  dk: ci_deathknight,

  "demon hunter": ci_demon_hunter,
  demonhunter: ci_demon_hunter,
  dh: ci_demon_hunter,

  druid: ci_druid,
  evoker: ci_evoker,
  hunter: ci_hunter,
  mage: ci_mage,
  monk: ci_monk,
  paladin: ci_paladin,
  priest: ci_priest,
  rogue: ci_rogue,
  shaman: ci_shaman,
  warlock: ci_warlock,
  warrior: ci_warrior,
};

// ---------- helpers ----------
function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classIconFor(rawClass) {
  const key = normalize(rawClass);
  return CLASS_ICON_SRC[key] || null;
}

function safeBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "true" || s === "saved";
  }
  return undefined;
}

function deriveSaved(item) {
  const candidates = [
    item?.saved,
    item?.isSaved,
    item?.lockoutSaved,
    item?.savedStatus,
    item?.lockStatus, // "saved" | "unsaved"
  ];
  for (const c of candidates) {
    const b = safeBool(c);
    if (typeof b === "boolean") return b;
  }
  return undefined; // kein Status bekannt
}

function RoleTitle({ roleKey, label, countText }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={ROLE_ICON_SRC[roleKey]}
        alt={label}
        width={16}
        height={16}
        className="inline-block"
        loading="lazy"
      />
      <span>
        {label} {countText ? `(${countText})` : ""}
      </span>
    </div>
  );
}

function ItemRow({ item, canManage, picked, onPick, onUnpick, busyIds }) {
  const classLabel =
    item?.classLabel ??
    item?.className ??
    item?.charClass ??
    item?.class ??
    "";
  const classSrc = classIconFor(classLabel);

  const isSaved = deriveSaved(item);
  const busy = busyIds?.has(item.id);

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <div className="min-w-0 flex items-center gap-2">
        {classSrc && (
          <img
            src={classSrc}
            alt={classLabel || "class"}
            width={20}
            height={20}
            className="shrink-0"
            loading="lazy"
          />
        )}
        <div className="min-w-0">
          <div className="truncate text-zinc-100">{item.who}</div>
          <div className="text-xs text-zinc-400">
            {classLabel || "-"} • {item.roleLabel}
            {item.note ? ` • ${item.note}` : ""}
          </div>
        </div>
      </div>

      <div className="ml-3 flex items-center gap-3">
        {isSaved === true && (
          <img
            src={statusSaved}
            alt="saved"
            width={16}
            height={16}
            className="shrink-0"
            loading="lazy"
          />
        )}
        {canManage &&
          (picked ? (
            <button
              onClick={() => onUnpick?.(item.id)}
              disabled={busy}
              className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              Unpick
            </button>
          ) : (
            <button
              onClick={() => onPick?.(item.id)}
              disabled={busy}
              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Pick
            </button>
          ))}
      </div>
    </div>
  );
}

function Column({ titleNode, items, canManage, onPick, onUnpick, busyIds, picked }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-zinc-400">{titleNode}</div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-500">
            keine
          </div>
        ) : (
          items.map((s) => (
            <ItemRow
              key={s.id}
              item={s}
              canManage={canManage}
              picked={picked}
              onPick={onPick}
              onUnpick={onUnpick}
              busyIds={busyIds}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Props:
 * - raid: { title, dateLabel, diffLabel, lootLabel, bosses, leadLabel, presetSlots? }
 * - grouped: { saved: {tanks,heals,dps,loot}, open: {tanks,heals,dps,loot} }
 * - canManage: boolean
 * - pick(id), unpick(id)
 * - busyIds: Set<number>
 */
export default function RaidDetailView({ raid, grouped, canManage, pick, unpick, busyIds }) {
  if (!raid) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        Raid nicht gefunden.
      </div>
    );
  }

  const rosterCount =
    (grouped?.saved?.tanks?.length || 0) +
    (grouped?.saved?.heals?.length || 0) +
    (grouped?.saved?.dps?.length || 0) +
    (grouped?.saved?.loot?.length || 0);

  const signupsCount =
    (grouped?.open?.tanks?.length || 0) +
    (grouped?.open?.heals?.length || 0) +
    (grouped?.open?.dps?.length || 0) +
    (grouped?.open?.loot?.length || 0);

  const caps = raid?.presetSlots || null;
  const capOf = (k) => (caps && Number(caps[k]) > 0 ? Number(caps[k]) : null);
  const fmtRoster = (cur, cap) => (cap ? `${cur}/${cap}` : String(cur));

  const rT = grouped?.saved?.tanks?.length || 0;
  const rH = grouped?.saved?.heals?.length || 0;
  const rD = grouped?.saved?.dps?.length || 0;
  const rL = grouped?.saved?.loot?.length || 0;

  const oT = grouped?.open?.tanks?.length || 0;
  const oH = grouped?.open?.heals?.length || 0;
  const oD = grouped?.open?.dps?.length || 0;
  const oL = grouped?.open?.loot?.length || 0;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      {/* Header */}
      <Section
        title={raid.title}
        right={
          <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-400">
              Roster ({rosterCount}) • Signups ({signupsCount})
            </div>
            <Link
              to="/raids"
              className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Zurück
            </Link>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="text-sm text-zinc-300">
            <div className="text-xs text-zinc-400">Datum</div>
            <div>{raid.dateLabel}</div>
          </div>
          <div className="text-sm text-zinc-300">
            <div className="text-xs text-zinc-400">Difficulty</div>
            <div>{raid.diffLabel}</div>
          </div>
          <div className="text-sm text-zinc-300">
            <div className="text-xs text-zinc-400">Loot</div>
            <div>{raid.lootLabel}</div>
          </div>
          <div className="text-sm text-zinc-300">
            <div className="text-xs text-zinc-400">Bosses</div>
            <div>{raid.bosses}</div>
          </div>
          <div className="text-sm text-zinc-300">
            <div className="text-xs text-zinc-400">Lead</div>
            <div>{raid.leadLabel}</div>
          </div>
        </div>
      </Section>

      {/* Roster */}
      <Section title={`Roster (${rosterCount})`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Column
            titleNode={<RoleTitle roleKey="tanks" label="Tanks" countText={fmtRoster(rT, capOf("tanks"))} />}
            items={grouped?.saved?.tanks || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            titleNode={<RoleTitle roleKey="heals" label="Healers" countText={fmtRoster(rH, capOf("heals"))} />}
            items={grouped?.saved?.heals || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            titleNode={<RoleTitle roleKey="dps" label="DPS" countText={fmtRoster(rD, capOf("dps"))} />}
            items={grouped?.saved?.dps || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            titleNode={<RoleTitle roleKey="loot" label="Lootbuddies" countText={fmtRoster(rL, capOf("loot"))} />}
            items={grouped?.saved?.loot || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
        </div>
      </Section>

      {/* Signups */}
      <Section title={`Signups (${signupsCount})`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Column
            titleNode={<RoleTitle roleKey="tanks" label="Tanks" countText={String(oT)} />}
            items={grouped?.open?.tanks || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <Column
            titleNode={<RoleTitle roleKey="heals" label="Healers" countText={String(oH)} />}
            items={grouped?.open?.heals || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <Column
            titleNode={<RoleTitle roleKey="dps" label="DPS" countText={String(oD)} />}
            items={grouped?.open?.dps || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <Column
            titleNode={<RoleTitle roleKey="loot" label="Lootbuddies" countText={String(oL)} />}
            items={grouped?.open?.loot || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
        </div>
      </Section>
    </div>
  );
}

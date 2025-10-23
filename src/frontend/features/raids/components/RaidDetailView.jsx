// src/frontend/features/raids/components/RaidDetailView.jsx
import React from "react";
import { Link } from "react-router-dom";

/* ---------- PNGs werden *gebundled* importiert (keine Server-Pfade) ---------- */
// Klassen
import CI_DK from "../../../../assets/Classes/ClassIcon_deathknight.png";
import CI_DH from "../../../../assets/Classes/ClassIcon_demon_hunter.png";
import CI_DRUID from "../../../../assets/Classes/ClassIcon_druid.png";
import CI_EVOKER from "../../../../assets/Classes/ClassIcon_evoker.png";
import CI_HUNTER from "../../../../assets/Classes/ClassIcon_hunter.png";
import CI_MAGE from "../../../../assets/Classes/ClassIcon_mage.png";
import CI_MONK from "../../../../assets/Classes/ClassIcon_monk.png";
import CI_PALADIN from "../../../../assets/Classes/ClassIcon_paladin.png";
import CI_PRIEST from "../../../../assets/Classes/ClassIcon_priest.png";
import CI_ROGUE from "../../../../assets/Classes/ClassIcon_rogue.png";
import CI_SHAMAN from "../../../../assets/Classes/ClassIcon_shaman.png";
import CI_WARLOCK from "../../../../assets/Classes/ClassIcon_warlock.png";
import CI_WARRIOR from "../../../../assets/Classes/ClassIcon_warrior.png";

// Rollen + Saved/Unsaved
import ICON_TANK from "../../../../assets/Roles/tank.png";
import ICON_HEAL from "../../../../assets/Roles/heal.png";
import ICON_DPS from "../../../../assets/Roles/dps.png";
import ICON_SAVED from "../../../../assets/Roles/saved.png";
import ICON_UNSAVED from "../../../../assets/Roles/unsaved.png";

/* ---------------- Mapping: Klassenname -> Bild ---------------- */
const CLASS_SLUGS = {
  "Death Knight": "deathknight",
  "Demon Hunter": "demon_hunter",
  Druid: "druid",
  Evoker: "evoker",
  Hunter: "hunter",
  Mage: "mage",
  Monk: "monk",
  Paladin: "paladin",
  Priest: "priest",
  Rogue: "rogue",
  Shaman: "shaman",
  Warlock: "warlock",
  Warrior: "warrior",
};

const CLASS_ICONS = {
  deathknight: CI_DK,
  demon_hunter: CI_DH,
  druid: CI_DRUID,
  evoker: CI_EVOKER,
  hunter: CI_HUNTER,
  mage: CI_MAGE,
  monk: CI_MONK,
  paladin: CI_PALADIN,
  priest: CI_PRIEST,
  rogue: CI_ROGUE,
  shaman: CI_SHAMAN,
  warlock: CI_WARLOCK,
  warrior: CI_WARRIOR,
};

const classIconUrl = (cls) => {
  const slug = CLASS_SLUGS[String(cls || "").trim()];
  return slug ? CLASS_ICONS[slug] : CI_WARRIOR; // Fallback
};

const lockoutIconUrl = (saved) => (saved ? ICON_SAVED : ICON_UNSAVED);

const roleHeaderIconUrl = (key) => {
  if (key === "tanks") return ICON_TANK;
  if (key === "heals") return ICON_HEAL;
  if (key === "dps") return ICON_DPS;
  if (key === "loot") return ICON_UNSAVED; // Wunsch: Lootbuddy -> unsaved
  return null;
};

/* ---------------- Layout-Bausteine ---------------- */
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

function ItemLine({ s }) {
  const ilvlText =
    typeof s?.ilvl === "number" && s.ilvl > 0 ? String(Math.round(s.ilvl)) : "–";

  const nameEl = s?.logsUrl ? (
    <a
      href={s.logsUrl}
      target="_blank"
      rel="noreferrer"
      className="text-sky-300 hover:underline"
      title="WarcraftLogs öffnen"
    >
      {s.who}
    </a>
  ) : (
    <span className="text-zinc-100">{s.who}</span>
  );

  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* Icons links */}
      <div className="flex items-center gap-2">
        <img
          src={classIconUrl(s.classLabel)}
          alt={s.classLabel || "Class"}
          className="h-5 w-5 rounded"
          loading="lazy"
          draggable={false}
        />
        <img
          src={lockoutIconUrl(!!s.lockoutSaved)}
          alt={s.lockoutSaved ? "Saved" : "UnSaved"}
          className="h-5 w-5"
          loading="lazy"
          draggable={false}
          title={s.lockoutSaved ? "Saved (Lockout belegt)" : "UnSaved (freier Lockout)"}
        />
      </div>

      {/* Text rechts */}
      <div className="min-w-0">
        <div className="truncate">{nameEl}</div>
        <div className="text-xs text-zinc-400">
          ILvl: {ilvlText}
          {s.note ? ` • ${s.note}` : ""}
        </div>
      </div>
    </div>
  );
}

function Column({ title, roleKey, items, canManage, onPick, onUnpick, busyIds, picked }) {
  const icon = roleHeaderIconUrl(roleKey);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
        {icon ? <img src={icon} alt={title} className="h-4 w-4" loading="lazy" /> : null}
        <span>{title}</span>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-500">keine</div>
        ) : (
          items.map((s) => {
            const isBusy = busyIds?.has(s.id);

            // --- FIX: ilvl nur anzeigen, wenn > 0 ---
            const ilvlNum =
              typeof s.ilvl === "number"
                ? s.ilvl
                : Number.isFinite(Number(s.ilvl))
                ? Number(s.ilvl)
                : NaN;
            const ilvlText =
              Number.isFinite(ilvlNum) && ilvlNum > 0
                ? `ilvl ${ilvlNum}`
                : undefined;

            const line = [
              typeof s.lockoutSaved === "boolean"
                ? s.lockoutSaved
                  ? "Saved"
                  : "UnSaved"
                : undefined,
              s.classLabel || undefined,
              s.roleLabel || undefined,
              ilvlText, // <- nur wenn > 0
              s.note ? `Note: ${s.note}` : undefined,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-zinc-100">{s.who}</div>
                    {s.logsUrl && (
                      <a
                        href={s.logsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-[11px] text-sky-300 hover:underline"
                        title="WarcraftLogs öffnen"
                      >
                        WarcraftLogs
                      </a>
                    )}
                  </div>

                  {line && (
                    <div className="mt-0.5 truncate text-[12px] text-zinc-400">
                      {line}
                    </div>
                  )}
                </div>

                {canManage &&
                  (picked ? (
                    <button
                      onClick={() => onUnpick?.(s.id)}
                      disabled={isBusy}
                      className="ml-3 rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                    >
                      Unpick
                    </button>
                  ) : (
                    <button
                      onClick={() => onPick?.(s.id)}
                      disabled={isBusy}
                      className="ml-3 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Pick
                    </button>
                  ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Props:
 * - raid: { title, dateLabel, diffLabel, lootLabel, bosses, leadLabel }
 * - grouped: { saved: {tanks,heals,dps,loot}, open: {tanks,heals,dps,loot} }
 * - canManage: boolean
 * - pick(id), unpick(id)
 * - busyIds: Set<number>
 */
export default function RaidDetailView({
  raid,
  grouped,
  canManage,
  pick,
  unpick,
  busyIds,
}) {
  if (!raid) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">Raid nicht gefunden.</div>;
  }

  const rosterCount = (grouped?.saved?.tanks?.length || 0)
    + (grouped?.saved?.heals?.length || 0)
    + (grouped?.saved?.dps?.length || 0)
    + (grouped?.saved?.loot?.length || 0);

  const signupsCount = (grouped?.open?.tanks?.length || 0)
    + (grouped?.open?.heals?.length || 0)
    + (grouped?.open?.dps?.length || 0)
    + (grouped?.open?.loot?.length || 0);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      {/* Header */}
      <Section
        title={raid.title}
        right={
          <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-400">Roster: {rosterCount} • Signups: {signupsCount}</div>
            <Link to="/raids" className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
              Zurück
            </Link>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
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

      {/* Saved roster – 2 Reihen: Tanks & DPS / Healers & Loot */}
      <Section title="Roster (Saved)">
        {/* Reihe 1 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Column
            title="Tanks"
            roleKey="tanks"
            items={grouped?.saved?.tanks || []}
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
            picked
          />
          <Column
            title="DPS"
            roleKey="dps"
            items={grouped?.saved?.dps || []}
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
            picked
          />
        </div>
        {/* Reihe 2 */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Column
            title="Healers"
            roleKey="heals"
            items={grouped?.saved?.heals || []}
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
            picked
          />
          <Column
            title="Lootbuddies"
            roleKey="loot"
            items={grouped?.saved?.loot || []}
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
            picked
          />
        </div>
      </Section>

      {/* Open signups – 2 Reihen: Tanks & DPS / Healers & Loot */}
      <Section title="Signups (Open)">
        {/* Reihe 1 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Column
            title="Tanks"
            roleKey="tanks"
            items={grouped?.open?.tanks || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <Column
            title="DPS"
            roleKey="dps"
            items={grouped?.open?.dps || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
        </div>
        {/* Reihe 2 */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Column
            title="Healers"
            roleKey="heals"
            items={grouped?.open?.heals || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <Column
            title="Lootbuddies"
            roleKey="loot"
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

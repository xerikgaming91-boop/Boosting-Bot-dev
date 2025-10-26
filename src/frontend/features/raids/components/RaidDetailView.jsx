// src/frontend/features/raids/components/RaidDetailView.jsx
import React from "react";
import { Link } from "react-router-dom";

// 🔗 Icon-Maps & kleine Icon-Komponente (shared)
import { getClassIcon, getRoleIcon, getClassLabel } from "../../../shared/lib/iconMaps.js";
import Icon from "../../../shared/components/ClassIcons.jsx";

/* ---------- kleine, wiederverwendbare UI-Bausteine ---------- */
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

function InfoItem({ label, value }) {
  return (
    <div className="py-2">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 truncate text-sm text-zinc-100">{value ?? "-"}</div>
    </div>
  );
}

/** Spaltenkopf mit Rollen-Icon */
function RoleHeader({ roleKey, title, suffix }) {
  const roleIcon = getRoleIcon(roleKey);
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
      <Icon src={roleIcon} alt={title} size={16} />
      <span>
        {title} {suffix ? <span className="text-zinc-500">({suffix})</span> : null}
      </span>
    </div>
  );
}

/** Eine Spalte (Roster oder Signups) mit Einträgen */
function Column({
  roleKey,       // "tank" | "heal" | "dps" | "lootbuddy"
  title,
  suffix,
  items,
  canManage,
  onPick,
  onUnpick,
  busyIds,
  picked,
}) {
  return (
    <div>
      <RoleHeader roleKey={roleKey} title={title} suffix={suffix} />
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-500">
            keine
          </div>
        ) : (
          items.map((s) => {
            const classIcon = getClassIcon(s.class || s.classLabel);
            const classAlt = getClassLabel(s.class || s.classLabel);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
              >
                <div className="min-w-0 flex items-center gap-2">
                  {/* Klassen-Icon vor dem Namen */}
                  <Icon
                    src={classIcon}
                    alt={classAlt}
                    title={classAlt}
                    size={16}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-zinc-100">{s.who}</div>
                    <div className="text-xs text-zinc-400">
                      {classAlt || s.classLabel || ""}
                      {s.itemLevel ? ` • ${s.itemLevel} ilvl` : ""}
                      {s.roleLabel ? ` • ${s.roleLabel}` : ""}
                      {s.note ? ` • ${s.note}` : ""}
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    {picked ? (
                      <button
                        className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                        onClick={() => onUnpick?.(s.id)}
                        disabled={busyIds?.has?.(s.id)}
                        title="Aus Roster entfernen"
                      >
                        Unpick
                      </button>
                    ) : (
                      <button
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                        onClick={() => onPick?.(s.id)}
                        disabled={busyIds?.has?.(s.id)}
                        title="Zum Roster hinzufügen"
                      >
                        Pick
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ----------------------- Checklist UI ----------------------- */
function StatRow({ count, label }) {
  return (
    <div className="flex items-center gap-2 leading-6 text-sm">
      <span className="w-6 tabular-nums font-medium text-emerald-400">{count || 0}×</span>
      <span className="text-zinc-200">{label}</span>
    </div>
  );
}
function ChecklistCard({ title, items = [] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="mb-3 text-sm font-semibold text-zinc-200">{title}</div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <StatRow key={it.key || it.label} count={it.count} label={it.label} />
        ))}
      </div>
    </div>
  );
}

/**
 * Props:
 * - raid, grouped, caps, counts
 * - checklist: { classes:[{label,count}], buffs:[...], utils:[...] }
 * - canManage, pick, unpick, busyIds
 */
export default function RaidDetailView({
  raid,
  grouped,
  caps,
  counts,
  checklist,
  canManage,
  pick,
  unpick,
  busyIds,
}) {
  if (!raid) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        Raid nicht gefunden.
      </div>
    );
  }

  const rosterTotal = counts?.roster?.total || 0;
  const signupsTotal = counts?.signups?.total || 0;
  const capTotal = caps?.total ?? null;

  // Fallbacks, falls in caps / counts alternative Keys verwendet werden
  const capHeals = caps?.heals ?? caps?.healers ?? 0;
  const cntHealsRoster = counts?.roster?.heals ?? counts?.roster?.healers ?? 0;
  const cntHealsSignups = counts?.signups?.heals ?? counts?.signups?.healers ?? 0;

  const capLoot = caps?.loot ?? caps?.lootbuddies ?? 0;
  const cntLootRoster = counts?.roster?.loot ?? counts?.roster?.lootbuddies ?? 0;
  const cntLootSignups = counts?.signups?.loot ?? counts?.signups?.lootbuddies ?? 0;

  return (
    <div className="space-y-4">
      {/* Kopf: wieder wie vorher mit 5 Spalten auf groß */}
      <Section
        title={raid.title}
        right={
          <div className="flex items-center gap-3">
            <div className="text-xs text-zinc-400">
              <span className="mr-3">
                Roster:{" "}
                <b className="text-zinc-100">
                  {rosterTotal}
                  {capTotal != null ? ` / ${capTotal}` : ""}
                </b>
              </span>
              <span>
                Signups: <b className="text-zinc-100">{signupsTotal}</b>
              </span>
            </div>
            <Link
              to="/raids"
              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20"
            >
              Zurück
            </Link>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <InfoItem label="Datum" value={raid.dateLabel} />
          <InfoItem label="Difficulty" value={raid.diffLabel} />
          <InfoItem label="Loot" value={raid.lootLabel} />
          <InfoItem label="Bosses" value={raid.bosses} />
          <InfoItem label="Lead" value={raid.leadLabel} />
        </div>
      </Section>

      {/* Roster (2 pro Reihe: Tank + DPS, dann Heal + Lootbuddy) */}
      <Section title="Roster (geplant)">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Reihe 1 */}
          <Column
            roleKey="tank"
            title="Tanks"
            suffix={caps ? `${counts?.roster?.tanks || 0} / ${caps.tanks || 0}` : `${counts?.roster?.tanks || 0}`}
            items={grouped?.saved?.tanks || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            roleKey="dps"
            title="DPS"
            suffix={caps ? `${counts?.roster?.dps || 0} / ${caps.dps || 0}` : `${counts?.roster?.dps || 0}`}
            items={grouped?.saved?.dps || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />

          {/* Reihe 2 */}
          <Column
            roleKey="heal"
            title="Healers"
            suffix={caps ? `${cntHealsRoster} / ${capHeals}` : `${cntHealsRoster}`}
            items={grouped?.saved?.heals || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            roleKey="lootbuddy"
            title="Lootbuddies"
            suffix={caps ? `${cntLootRoster} / ${capLoot}` : `${cntLootRoster}`}
            items={grouped?.saved?.loot || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
        </div>
      </Section>

      {/* Signups (2 pro Reihe: Tank + DPS, dann Heal + Lootbuddy) */}
      <Section title="Signups (offen)">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Reihe 1 */}
          <Column
            roleKey="tank"
            title="Tanks"
            suffix={`${counts?.signups?.tanks || 0}`}
            items={grouped?.open?.tanks || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <Column
            roleKey="dps"
            title="DPS"
            suffix={`${counts?.signups?.dps || 0}`}
            items={grouped?.open?.dps || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />

          {/* Reihe 2 */}
          <Column
            roleKey="heal"
            title="Healers"
            suffix={`${cntHealsSignups}`}
            items={grouped?.open?.heals || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <Column
            roleKey="lootbuddy"
            title="Lootbuddies"
            suffix={`${cntLootSignups}`}
            items={grouped?.open?.loot || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
        </div>
      </Section>

      {/* ✅ Checklist */}
      <Section title="Checklist">
        <div className="grid gap-4 lg:grid-cols-3">
          <ChecklistCard title="Classes" items={checklist?.classes || []} />
          <ChecklistCard title="Buffs / Debuffs" items={checklist?.buffs || []} />
          <ChecklistCard title="Utility" items={checklist?.utils || []} />
        </div>
      </Section>
    </div>
  );
}

// src/frontend/features/raids/components/RaidDetailView.jsx
import React from "react";
import { Link } from "react-router-dom";

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
  // Schlank: keine Box, nur Label + Wert
  return (
    <div className="py-2">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-sm text-zinc-100 truncate">{value ?? "-"}</div>
    </div>
  );
}

function Column({ title, items, canManage, onPick, onUnpick, busyIds, picked }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-zinc-400">{title}</div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-500">
            keine
          </div>
        ) : (
          items.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-zinc-100">{s.who}</div>
                <div className="text-xs text-zinc-400">
                  {s.classLabel}
                  {s.itemLevel ? ` • ${s.itemLevel} ilvl` : ""}
                  {` • ${s.roleLabel}`}
                  {s.note ? ` • ${s.note}` : ""}
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
          ))
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

  return (
    <div className="space-y-4">
      {/* Header wie in deinem Screenshot: Titel links, rechts Zähler + Zurück */}
      <Section
        title={raid.title}
        right={
          <div className="flex items-center gap-3">
            <div className="text-xs text-zinc-400">
              <span className="mr-3">
                Roster: <b className="text-zinc-100">{rosterCount}</b>
              </span>
              <span>
                Signups: <b className="text-zinc-100">{signupsCount}</b>
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
        {/* Infozeile ohne Boxen */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <InfoItem label="Datum"      value={raid.dateLabel} />
          <InfoItem label="Difficulty" value={raid.diffLabel} />
          <InfoItem label="Loot"       value={raid.lootLabel} />
          <InfoItem label="Bosses"     value={raid.bosses} />
          <InfoItem label="Lead"       value={raid.leadLabel} />
        </div>
      </Section>

      {/* Roster */}
      <Section title="Roster (geplant)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Column
            title="🛡️ Tanks"
            items={grouped?.saved?.tanks || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            title="💚 Healers"
            items={grouped?.saved?.heals || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            title="🗡️ DPS"
            items={grouped?.saved?.dps || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            title="🍀 Lootbuddies"
            items={grouped?.saved?.loot || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
        </div>
      </Section>

      {/* Offene Anmeldungen */}
      <Section title="Signups (offen)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Column
            title="🛡️ Tanks"
            items={grouped?.open?.tanks || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <Column
            title="💚 Healers"
            items={grouped?.open?.heals || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <Column
            title="🗡️ DPS"
            items={grouped?.open?.dps || []}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <Column
            title="🍀 Lootbuddies"
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

// src/frontend/features/raids/components/RaidDetailView.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import RaidInlineEdit from "./RaidInlineEdit.jsx";


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

function Column({ title, items, canManage, onPick, onUnpick, busyIds, picked }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-zinc-400">{title}</div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-500">keine</div>
        ) : (
          items.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-zinc-100">{s.who}</div>
                <div className="text-xs text-zinc-400">
                  {s.classLabel} • {s.roleLabel}
                  {s.note ? ` • ${s.note}` : ""}
                </div>
              </div>

              {canManage &&
                (picked ? (
                  <button
                    onClick={() => onUnpick?.(s.id)}
                    disabled={busyIds?.has(s.id)}
                    className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                  >
                    Unpick
                  </button>
                ) : (
                  <button
                    onClick={() => onPick?.(s.id)}
                    disabled={busyIds?.has(s.id)}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Pick
                  </button>
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Props:
 * - raid: { id, title, dateLabel, diffLabel, lootLabel, bosses, leadLabel }
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
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        Raid nicht gefunden.
      </div>
    );
  }

  // Nur für das Bearbeiten der Raid-Stammdaten (Roster/Anmeldungen bleiben unverändert)
  const [editing, setEditing] = useState(false);

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
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      {/* Header */}
      <Section
        title={raid.title}
        right={
          <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-400">
              Roster: {rosterCount} • Signups: {signupsCount}
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                title="Raid bearbeiten"
              >
                {editing ? "Bearbeiten schließen" : "Bearbeiten"}
              </button>
            )}

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

        {/* Inline-Edit-Panel NUR für Raid-Stammdaten (optional einblendbar) */}
        {canManage && editing && (
          <div className="mt-3">
            <RaidInlineEdit
              raid={raid}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                // Falls dein Detail-Hook ein refresh() bereitstellt, hier aufrufen.
                // Beispiel: refresh();
                setEditing(false);
              }}
            />
          </div>
        )}
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

      {/* Signups offen */}
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

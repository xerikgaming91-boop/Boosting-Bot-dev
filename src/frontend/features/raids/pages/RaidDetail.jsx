// src/frontend/features/raids/pages/RaidDetail.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import useRaidDetail from "../hooks/useRaidDetail";

function SectionCard({ title, children, right }) {
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

function SignupItem({ s, canManage, onPick, onUnpick, busy }) {
  const name = s.char?.name ? `${s.char.name}${s.char.realm ? "-" + s.char.realm : ""}` : (s.displayName || s.userId);
  const klass = s.char?.class || s.class || "";
  const role  = (s.type || "").toUpperCase();
  const note  = s.note;

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
      <div className="min-w-0">
        <div className="truncate text-zinc-100">
          {name} {klass ? <span className="text-zinc-400">({klass})</span> : null}
        </div>
        <div className="text-xs text-zinc-400">
          Rolle: {role}{note ? ` · ${note}` : ""}
        </div>
      </div>
      {canManage && (
        s.saved ? (
          <button
            disabled={busy}
            onClick={() => onUnpick?.(s.id)}
            className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
          >
            Unpick
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => onPick?.(s.id)}
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Pick
          </button>
        )
      )}
    </div>
  );
}

function ColumnGroup({ title, items, empty = "keine", canManage, onPick, onUnpick, busyIds }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-zinc-400">{title}</div>
      <div className="space-y-2">
        {items.length ? items.map(s => (
          <SignupItem
            key={s.id}
            s={s}
            canManage={canManage}
            onPick={onPick}
            onUnpick={onUnpick}
            busy={busyIds.has(s.id)}
          />
        )) : <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-500">{empty}</div>}
      </div>
    </div>
  );
}

export default function RaidDetail() {
  const { id } = useParams();
  const { raid, grouped, canManage, loading, pick, unpick, busyIds } = useRaidDetail(Number(id));

  if (loading && !raid) {
    return <div className="p-6 text-zinc-400">Lade …</div>;
  }
  if (!raid) {
    return <div className="p-6 text-rose-400">Raid nicht gefunden.</div>;
  }

  const dt = raid.date ? new Date(raid.date) : null;
  const dateStr = dt ? dt.toLocaleString() : "-";

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      {/* Header */}
      <SectionCard
        title={raid.title}
        right={<Link to="/raids" className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800">Zurück</Link>}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-sm text-zinc-300">
            <div className="text-zinc-400 text-xs">Datum</div>
            <div>{dateStr}</div>
          </div>
          <div className="text-sm text-zinc-300">
            <div className="text-zinc-400 text-xs">Difficulty</div>
            <div>{raid.difficulty}</div>
          </div>
          <div className="text-sm text-zinc-300">
            <div className="text-zinc-400 text-xs">Loot</div>
            <div>{(raid.lootType || "").toUpperCase()}</div>
          </div>
          <div className="text-sm text-zinc-300">
            <div className="text-zinc-400 text-xs">Lead</div>
            <div>{raid.leadDisplayName || raid.lead || "-"}</div>
          </div>
        </div>
      </SectionCard>

      {/* Roster */}
      <SectionCard title="Roster (geplant)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ColumnGroup
            title="🛡️ Tanks"
            items={grouped.saved.tanks}
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <ColumnGroup
            title="💚 Healers"
            items={grouped.saved.heals}
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <ColumnGroup
            title="🗡️ DPS"
            items={grouped.saved.dps}
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <ColumnGroup
            title="🍀 Lootbuddys"
            items={grouped.saved.loot}
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
        </div>
      </SectionCard>

      {/* Signups offen */}
      <SectionCard title="Signups (offen)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ColumnGroup
            title="🛡️ Tanks"
            items={grouped.open.tanks}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <ColumnGroup
            title="💚 Healers"
            items={grouped.open.heals}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <ColumnGroup
            title="🗡️ DPS"
            items={grouped.open.dps}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
          <ColumnGroup
            title="🍀 Lootbuddys"
            items={grouped.open.loot}
            canManage={canManage}
            onPick={pick}
            busyIds={busyIds}
          />
        </div>
      </SectionCard>
    </div>
  );
}

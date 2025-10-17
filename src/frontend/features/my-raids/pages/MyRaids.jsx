// src/frontend/features/my-raids/pages/MyRaids.jsx
import React, { useState } from "react";
import useMyRaids from "../hooks/useMyRaids";
import MyRaidTable from "../components/MyRaidTable";

export default function MyRaids() {
  // UI: scope & cycle Filter
  const [showPast, setShowPast] = useState(false);
  const [cycle, setCycle] = useState("all"); // 'current' | 'next' | 'all'
  const scope = showPast ? "all" : "upcoming";

  const { upcoming, past, loading, error } = useMyRaids({ scope, cycle, onlyPicked: true });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Meine Raids</h1>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Cycle:</label>
          <select
            value={cycle}
            onChange={(e) => setCycle(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
          >
            <option value="all">Alle</option>
            <option value="current">Aktueller Zyklus</option>
            <option value="next">Nächster Zyklus</option>
          </select>

          <button
            onClick={() => setShowPast((v) => !v)}
            className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            {showPast ? "Nur bevorstehende anzeigen" : "Vergangene einblenden"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">Lade …</div>
      ) : error ? (
        <div className="rounded-lg border border-rose-800/60 bg-rose-950/40 p-4 text-sm text-rose-300">
          Fehler beim Laden.
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-300">Bevorstehend – Gepickt</h2>
            <MyRaidTable items={upcoming.rostered || []} emptyText="Du bist in keinen kommenden Raids gepickt." />
          </section>

          {showPast && (
            <section className="space-y-3">
              <h2 className="mt-6 text-sm font-medium text-zinc-300">Vergangenheit – Gepickt</h2>
              <MyRaidTable items={past.rostered || []} emptyText="Kein vergangener Raid (gepickt)." />
            </section>
          )}
        </>
      )}
    </div>
  );
}

// src/frontend/features/raids/pages/RaidsList.jsx
import React from "react";
import { useRaidBootstrap } from "../hooks/useRaidBootstrap";
import RaidCreateForm from "../components/RaidCreateForm";
import RaidListTable from "../components/RaidListTable";

export default function RaidsList() {
  const {
    me,
    leads,
    raids,
    loading,
    loadingRaids,   // <- neu: boolean aus Hook
    error,
    createRaid,
    deleteRaid,
  } = useRaidBootstrap();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Seite */}
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">
        Raids
      </h1>

      {/* Grid: Create (links) + Hinweise (rechts hidden) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-12">
          {/* Card: Raid erstellen */}
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 shadow-xl ring-1 ring-black/5 backdrop-blur">
            <div className="border-b border-zinc-800/60 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Raid erstellen
              </h2>
            </div>
            <div className="px-5 py-5">
              <RaidCreateForm
                me={me}
                leads={leads}
                onCreate={createRaid}
                loading={loading === "create"}
              />
              {error?.create && (
                <p className="mt-3 text-sm text-red-400">
                  {String(error.create)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Liste geplanter Raids */}
        <section className="lg:col-span-12">
          <div className="mt-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/70 shadow-xl ring-1 ring-black/5 backdrop-blur">
            <div className="border-b border-zinc-800/60 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Geplante Raids
              </h2>
            </div>

            <div className="px-2 py-3 sm:px-4">
              {loadingRaids ? (
                <div className="px-3 py-10 text-center text-zinc-400">
                  Lädt …
                </div>
              ) : error ? (
                <div className="px-3 py-6 text-sm text-red-400">
                  Fehler beim Laden der Raids.
                </div>
              ) : Array.isArray(raids) && raids.length > 0 ? (
                <RaidListTable
                  rows={raids}
                  onDelete={deleteRaid}
                  me={me}
                  onlyFuture={false}   // <- zeigt ALLE; bei Bedarf auf true setzen
                />
              ) : (
                <div className="px-3 py-10 text-center text-zinc-400">
                  Noch keine Raids angelegt.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

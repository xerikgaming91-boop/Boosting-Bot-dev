// src/frontend/features/my-raids/pages/MyRaids.jsx
import React, { useEffect, useState } from "react";
import useMyRaids from "../hooks/useMyRaids";
import MyRaidTable from "../components/MyRaidTable";

export default function MyRaids() {
  // 🔐 Robuster Guard (wie RaidsList, aber mit strenger JSON-Prüfung)
  const [me, setMe] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadMe() {
      try {
        const res = await fetch("/api/users/me", {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        // Wenn nicht ok ODER kein JSON → als ausgeloggt behandeln
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || !ct.includes("application/json")) {
          if (!ignore) setMe(null);
          return;
        }

        const data = await res.json().catch(() => null);
        const user = data?.user ?? data ?? null;

        // Minimal-Validierung: ohne id/discordId als ausgeloggt einstufen
        const isValid =
          user &&
          (user.id != null || user.discordId != null || user.username != null);

        if (!ignore) setMe(isValid ? user : null);
      } catch {
        if (!ignore) setMe(null);
      } finally {
        if (!ignore) setAuthLoading(false);
      }
    }

    loadMe();
    return () => {
      ignore = true;
    };
  }, []);

  // ⚠️ Alle weiteren Hooks VOR jeglichem Return aufrufen (Order bleibt stabil)
  const [showPast, setShowPast] = useState(false);
  const [cycle, setCycle] = useState("all"); // 'current' | 'next' | 'all'
  const scope = showPast ? "all" : "upcoming";

  // Hook immer aufrufen (nicht bedingt), selbst wenn 401 passiert.
  const { upcoming, past, loading, error } = useMyRaids({
    scope,
    cycle,
    onlyPicked: true,
    // Falls euer Hook ein 'enabled' o.ä. unterstützt, könnt ihr das hier aktivieren:
    // enabled: !!me,
  });

  // 🧭 Render-Guards NACH den Hooks
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-6 text-zinc-300">
          Lade …
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">
          Meine Raids
        </h1>
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-6 text-zinc-300">
          Bitte einloggen, um diese Seite zu nutzen.
        </div>
      </div>
    );
  }

  // ✅ Eigentliche Seite
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
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
          Lade …
        </div>
      ) : error ? (
        // Achtung: Dieser Fehler-Block erscheint jetzt nur noch,
        // wenn du WIRKLICH eingeloggt bist (weil !me oben bereits returnt).
        <div className="rounded-lg border border-rose-800/60 bg-rose-950/40 p-4 text-sm text-rose-300">
          Fehler beim Laden.
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-300">
              Bevorstehend – Gepickt
            </h2>
            <MyRaidTable
              items={upcoming?.rostered || []}
              emptyText="Du bist in keinen kommenden Raids gepickt."
            />
          </section>

          {showPast && (
            <section className="space-y-3">
              <h2 className="mt-6 text-sm font-medium text-zinc-300">
                Vergangenheit – Gepickt
              </h2>
              <MyRaidTable
                items={past?.rostered || []}
                emptyText="Kein vergangener Raid (gepickt)."
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}

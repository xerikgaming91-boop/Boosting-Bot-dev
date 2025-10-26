import React from "react";
import { useParams } from "react-router-dom";
import useRaidDetail from "../hooks/useRaidDetail";
import RaidDetailView from "../components/RaidDetailView";

/* Kleine Inline-Alert-Komponente */
function InlineAlert({ kind = "error", message, onClose }) {
  if (!message) return null;
  const color =
    kind === "error"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
      : "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return (
    <div className={`mx-auto max-w-4xl rounded-xl border ${color} px-4 py-3 text-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium">Fehler: <span className="font-normal">{String(message)}</span></div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-800"
            aria-label="Fehlermeldung schließen"
          >
            Schließen
          </button>
        )}
      </div>
    </div>
  );
}

export default function RaidDetail() {
  const { id } = useParams();
  const {
    raid,
    grouped,
    caps,
    counts,
    checklist,
    canManage,
    loading,
    loadError,
    actionError,
    clearActionError,
    pick,
    unpick,
    busyIds,
  } = useRaidDetail(Number(id));

  // Beim initialen Laden: Platzhalter
  if (loading && !raid) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        Lade …
      </div>
    );
  }

  // ❗ WICHTIG: Nicht mehr weg-navigieren / nicht abbrechen!
  // Stattdessen oben eine Inline-Fehlermeldung zeigen und die Seite weiterhin rendern.
  return (
    <div className="space-y-3">
      {/* Ladefehler (nicht-blockierend, falls wir schon Daten haben) */}
      {loadError && <InlineAlert kind="error" message={loadError} />}
      {/* Aktionsfehler (Pick/Unpick etc.) */}
      {actionError && <InlineAlert kind="error" message={actionError} onClose={clearActionError} />}

      <RaidDetailView
        raid={raid}
        grouped={grouped}
        caps={caps}
        counts={counts}
        checklist={checklist}
        canManage={canManage}
        pick={pick}
        unpick={unpick}
        busyIds={busyIds}
      />
    </div>
  );
}

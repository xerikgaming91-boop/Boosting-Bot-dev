// src/frontend/features/raids/pages/RaidDetail.jsx
import React from "react";
import { useParams } from "react-router-dom";
import useRaidDetail from "../hooks/useRaidDetail";
import RaidDetailView from "../components/RaidDetailView";

export default function RaidDetail() {
  const { id } = useParams();
  const { raid, grouped, caps, counts, canManage, loading, error, pick, unpick, busyIds } =
    useRaidDetail(Number(id));

  if (loading && !raid) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        Lade …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-rose-400">
        Fehler: {String(error)}
      </div>
    );
  }

  return (
    <RaidDetailView
      raid={raid}
      grouped={grouped}
      caps={caps}
      counts={counts}
      canManage={canManage}
      pick={pick}
      unpick={unpick}
      busyIds={busyIds}
    />
  );
}

// src/frontend/features/raids/components/RaidListTable.jsx
import React, { useMemo } from "react";

/**
 * Mappt r.lead (ID/String) ➜ DisplayName/Username
 */
function formatLead(leadValue, leads = []) {
  if (leadValue === null || leadValue === undefined || leadValue === "") return "-";
  const s = String(leadValue);

  // Finde passenden Lead in der übergebenen Leads-Liste
  const found =
    leads.find((u) => String(u.id) === s) ||
    leads.find((u) => String(u.discordId) === s);

  // Nimm bevorzugt den Discord DisplayName, dann username, sonst die rohe Angabe
  return (
    found?.displayName ||
    found?.username ||
    found?.globalName ||
    found?.name ||
    s
  );
}

/**
 * Props:
 * - rows:  Raid[]
 * - leads: User[]   (für Anzeige des Lead-Namens)
 * - me:    Session-User (optional)
 * - onDelete(id): Promise<void> | void
 * - onlyFuture?: boolean (default false)  -> wenn true, filtert date < now (lokale Zeit)
 */
export default function RaidListTable({
  rows = [],
  leads = [],
  me = null,
  onDelete,
  onlyFuture = false,
}) {
  const now = Date.now();

  const items = useMemo(() => {
    const base = Array.isArray(rows) ? rows : [];
    if (!onlyFuture) return base;
    return base.filter((r) => {
      const t = new Date(r.date).getTime();
      return Number.isFinite(t) ? t >= now : true;
    });
  }, [rows, onlyFuture, now]);

  if (!items.length) {
    return (
      <div className="px-3 py-10 text-center text-zinc-400">
        Keine Raids gefunden.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-800">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-zinc-400">
            <th className="px-4 py-3">Titel</th>
            <th className="px-4 py-3">Datum</th>
            <th className="px-4 py-3">Uhrzeit</th>
            <th className="px-4 py-3">Diff</th>
            <th className="px-4 py-3">Loot</th>
            <th className="px-4 py-3">Bosses</th>
            <th className="px-4 py-3">Lead</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 text-sm text-zinc-200">
          {items.map((r) => {
            const dt = new Date(r.date);
            const dateStr = dt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
            const timeStr = dt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            const leadText = formatLead(r.lead, leads);

            return (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3">{dateStr}</td>
                <td className="px-4 py-3">{timeStr}</td>
                <td className="px-4 py-3">{r.difficulty || "-"}</td>
                <td className="px-4 py-3">{r.lootType || "-"}</td>
                <td className="px-4 py-3">{r.bosses ?? "-"}</td>
                <td className="px-4 py-3">{leadText}</td>
                <td className="px-4 py-3 text-right">
                  {typeof onDelete === "function" && (
                    <button
                      className="rounded-lg border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                      onClick={() => onDelete(r.id)}
                    >
                      Löschen
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

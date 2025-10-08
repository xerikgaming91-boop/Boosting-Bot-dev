// src/frontend/features/my-raids/components/MyRaidTable.jsx
import React from "react";

function prettyDiff(d) {
  if (!d) return "-";
  const u = String(d).toUpperCase();
  if (u === "HC") return "Heroic";
  if (u === "NHC" || u === "NORMAL") return "Normal";
  return d;
}
function prettyLoot(v) {
  const s = String(v || "").toLowerCase();
  if (s === "vip") return "VIP";
  if (s === "saved") return "Saved";
  if (s === "unsaved") return "UnSaved";
  return v || "-";
}
function formatDate(iso) {
  try {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleString();
  } catch {
    return "-";
  }
}

/**
 * Props:
 * - items: Array<{ raid, signup, char }>
 * - emptyText?: string
 */
export default function MyRaidTable({ items = [], emptyText = "Keine Einträge." }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
      <table className="min-w-full divide-y divide-zinc-800">
        <thead className="bg-zinc-900/70">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Raid</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Datum</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Diff.</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Loot</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Status</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Rolle</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Char</th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">Aktion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {items.map((it) => {
            const r = it.raid || {};
            const s = it.signup || {};
            const c = it.char || null;
            const picked = String(s.status || "").toUpperCase() === "PICKED";

            return (
              <tr key={`${s.id}`} className="hover:bg-zinc-900/50">
                <td className="px-3 py-2 text-sm text-zinc-200">{r.title || "-"}</td>
                <td className="px-3 py-2 text-sm text-zinc-300">{formatDate(r.date)}</td>
                <td className="px-3 py-2 text-sm text-zinc-300">{prettyDiff(r.difficulty)}</td>
                <td className="px-3 py-2 text-sm text-zinc-300">{prettyLoot(r.lootType)}</td>
                <td className="px-3 py-2 text-sm">
                  <span className={picked ? "text-emerald-400" : "text-amber-300"}>
                    {picked ? "Gepickt" : "Angemeldet"}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-zinc-300">
                  {String(s.type || "").toUpperCase() === "LOOTBUDDY" ? "Lootbuddy" : (s.type || "-")}
                </td>
                <td className="px-3 py-2 text-sm text-zinc-300">
                  {c ? `${c.name} - ${c.realm} (${c.class || ""}${c.spec ? `/${c.spec}` : ""})` : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <a
                    href={r.detailUrl || `/raids/${r.id}`}
                    className="inline-flex items-center rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                    title="Raiddetails"
                  >
                    Details
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

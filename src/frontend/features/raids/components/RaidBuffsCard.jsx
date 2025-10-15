// src/frontend/features/raids/components/RaidBuffsCard.jsx
import React from "react";

/**
 * Reine Anzeige. Erwartet items = [{ id, label, count }]
 * - zeigt ALLE Buffs
 * - wenn count > 0: "1 x", "2 x" (grün)
 * - wenn count === 0: "missing" (rot)
 */
export default function RaidBuffsCard({ items = [] }) {
  const list = Array.isArray(items) ? items : [];

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70">
      <div className="border-b border-zinc-800/60 px-5 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Buffs / Debuffs
        </h3>
      </div>

      <div className="p-4">
        {list.length === 0 ? (
          <div className="text-sm text-zinc-400">Keine Daten.</div>
        ) : (
          <ul className="space-y-1">
            {list.map((b) => (
              <li key={b.id} className="flex items-center gap-2 text-sm">
                {b.count > 0 ? (
                  <span className="text-emerald-400">{b.count} x</span>
                ) : (
                  <span className="text-rose-400">missing</span>
                )}
                <span className="text-zinc-200">{b.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

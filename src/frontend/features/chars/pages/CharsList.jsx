// src/frontend/features/chars/pages/CharsList.jsx
import React from "react";

export default function CharsList() {
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <header className="mb-4">
          <h1 className="text-xl font-semibold">Chars</h1>
          <p className="text-sm text-zinc-300">
            Charaktere verwalten. (Später: Filter, Sortierung, Import aus Discord/Logs.)
          </p>
        </header>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary">Neu anlegen</button>
          <button type="button" className="btn-ghost">Import</button>
        </div>

        {/* Tabelle (Platzhalter) */}
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-zinc-300">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Klasse</th>
                <th className="px-3 py-2 text-left">Rolle</th>
                <th className="px-3 py-2 text-left">iLvl</th>
                <th className="px-3 py-2 text-left">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/10">
                <td className="px-3 py-2">—</td>
                <td className="px-3 py-2">—</td>
                <td className="px-3 py-2">—</td>
                <td className="px-3 py-2">—</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="btn-ghost">Bearbeiten</button>
                    <button className="btn-ghost">Löschen</button>
                  </div>
                </td>
              </tr>
              {/* echte Daten folgen via Hook/Service */}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

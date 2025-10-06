import React from "react";

/**
 * PresetsList
 * Reine Page-Komponente (View). Keine Datenzugriffe hier.
 * Später per Hook/Service (z. B. usePresetsBootstrap) anbinden.
 */
export default function PresetsList() {
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <header className="mb-4">
          <h1 className="text-xl font-semibold">Presets</h1>
          <p className="text-sm text-zinc-300">
            Vorlagen für Raid-Ankündigungen, Rollen und Channel-Struktur.
          </p>
        </header>

        {/* TODO: Replace with real controls/table */}
        <div className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
          Inhalte folgen: Liste der Presets, Create/Edit-Dialoge, Import/Export …
        </div>
      </section>
    </div>
  );
}

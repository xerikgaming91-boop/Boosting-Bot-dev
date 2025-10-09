// src/frontend/features/raids/components/RaidEditForm.jsx
import React from "react";

export default function RaidEditForm({
  // rights + data
  me,
  leads = [],
  canPickLead = false,

  // form state + actions
  title, setTitle,
  difficulty, setDifficulty,
  lootType, setLootType,
  dateLocal, setDateLocal,
  bosses, setBosses,
  lead, setLead,
  autoTitle, setAutoTitle,
  lootOptions,
  canSave,
  saving,
  error,
  submit,
  regenerateTitle,
  onCancel,
}) {
  const leadDisplay = me?.displayName || me?.username || me?.discordId || "";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-200">Raid bearbeiten</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={submit}
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? "Speichere …" : "Speichern"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-rose-800/50 bg-rose-950/40 p-2 text-xs text-rose-300">
          Fehler beim Speichern.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Titel</label>
          <div className="flex gap-2">
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Manaforge HC VIP"
            />
            <button
              type="button"
              onClick={regenerateTitle}
              className="rounded-md border border-zinc-700 px-2 text-xs text-zinc-300 hover:bg-zinc-800"
              title="Titel generieren"
            >
              ⚙️
            </button>
          </div>
          <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={autoTitle}
              onChange={(e) => setAutoTitle(e.target.checked)}
            />
            Titel automatisch aktualisieren
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Datum & Zeit</label>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={dateLocal}
            onChange={(e) => setDateLocal(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Difficulty</label>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="HC">Heroic</option>
            <option value="Mythic">Mythic</option>
            <option value="Normal">Normal</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Loot</label>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={lootType}
            onChange={(e) => setLootType(e.target.value)}
          >
            {lootOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Bosses</label>
          <input
            type="number"
            min={0}
            max={8}
            disabled={String(difficulty).toUpperCase() !== "MYTHIC"}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 disabled:opacity-60"
            value={bosses}
            onChange={(e) => setBosses(e.target.value)}
          />
          {String(difficulty).toUpperCase() !== "MYTHIC" && (
            <p className="mt-1 text-[11px] text-zinc-400">Bei HC/Normal ist 8 gesetzt.</p>
          )}
        </div>

        {canPickLead ? (
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Raidlead</label>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
              value={lead || ""}
              onChange={(e) => setLead(e.target.value)}
            >
              <option value="">– auswählen –</option>
              {leads.map((u) => {
                const value = u.discordId || String(u.id);
                const name = u.displayName || u.username || u.globalName || value;
                return (
                  <option key={value} value={value}>{name}</option>
                );
              })}
            </select>
          </div>
        ) : (
          <div className="opacity-60">
            <label className="mb-1 block text-xs text-zinc-400">Raidlead</label>
            <input
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-400"
              value={leadDisplay}
              readOnly
            />
          </div>
        )}
      </div>
    </div>
  );
}

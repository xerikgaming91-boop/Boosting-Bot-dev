// src/frontend/features/raids/components/RaidEditForm.jsx
import React, { useEffect, useMemo } from "react";
import useRaidEdit from "../hooks/useRaidEdit";

/**
 * RaidEditForm (Update)
 * - Felder: Datum/Zeit, Difficulty, LootType, Raidlead (Dropdown), Bosses (nur Mythic)
 * - Lead-Dropdown analog RaidCreateForm.jsx
 */
export default function RaidEditForm({
  raid,
  setRaid,
  me,
  canPickLead = false,
  leads = [],
  onClose,
}) {
  const edit = useRaidEdit({ raid, setRaid, canEditLead: canPickLead, onUpdated: onClose });

  const Field = ({ label, hint, children }) => (
    <div className="space-y-1">
      {label ? <label className="text-sm font-medium text-zinc-200">{label}</label> : null}
      {children}
      {hint ? <p className="text-xs text-zinc-400">{hint}</p> : null}
    </div>
  );

  const isMythic = String(edit.form.difficulty || "").toLowerCase() === "mythic";
  const leadKey = edit.form.__leadKey; // vom Hook ermittelt

  // Mythic => LootType immer VIP
  useEffect(() => {
    if (isMythic && edit.form.lootType !== "VIP") {
      edit.set("lootType", "VIP");
    }
  }, [isMythic]); // eslint-disable-line react-hooks/exhaustive-deps

  // Label für aktuellen Lead (falls read-only)
  const currentLeadDisplay = useMemo(() => {
    if (!leadKey) return "";
    const value = String(edit.form[leadKey] ?? "");
    const found = (leads || []).find((u) => String(u.discordId || u.id) === value);
    return (
      found?.displayName ||
      found?.username ||
      found?.globalName ||
      raid?.leadDisplayName ||
      raid?.leadUsername ||
      raid?.lead ||
      value
    );
  }, [leads, raid, leadKey, edit.form]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">Raid bearbeiten</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Schließen
          </button>
        )}
      </div>

      {edit.error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
          {edit.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Datum & Zeit">
          <input
            type="datetime-local"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            {...edit.bind("dateTime")}
          />
        </Field>

        <Field label="Schwierigkeit">
          <select
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            {...edit.bind("difficulty")}
          >
            <option value="">— auswählen —</option>
            <option value="Normal">Normal</option>
            <option value="Heroic">Heroic</option>
            <option value="Mythic">Mythic</option>
          </select>
        </Field>

        <Field label="Loot-Type" hint={isMythic ? "Bei Mythic ist nur VIP erlaubt." : undefined}>
          <select
            disabled={isMythic}
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600 disabled:opacity-60"
            {...edit.bind("lootType")}
          >
            <option value="Saved">Saved</option>
            <option value="Unsaved">Unsaved</option>
            <option value="VIP">VIP</option>
          </select>
        </Field>

        {/* Raidlead wie in der Create-Form: Dropdown aus 'leads' */}
        {leadKey && (
          canPickLead ? (
            <Field label="Raidlead">
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
                {...edit.bind(leadKey)}
              >
                <option value="">– auswählen –</option>
                {(leads || []).map((u) => {
                  const value = String(u.discordId || u.id);
                  const name = u.displayName || u.username || u.globalName || value;
                  return (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </Field>
          ) : (
            <Field label="Raidlead">
              <input
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-400"
                value={currentLeadDisplay}
                readOnly
              />
            </Field>
          )
        )}

        {isMythic && (
          <Field label="Bossanzahl (Mythic)">
            <input
              type="number"
              min="0"
              className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
              placeholder="z. B. 8"
              {...edit.bind("bosses")}
            />
          </Field>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={edit.submit}
          disabled={edit.saving || !edit.dirty}
          className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          title={!edit.dirty ? "Keine Änderungen" : "Änderungen speichern"}
        >
          {edit.saving ? "Speichere…" : "Speichern"}
        </button>

        <button
          onClick={edit.cancel}
          disabled={edit.saving}
          className="rounded-md border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

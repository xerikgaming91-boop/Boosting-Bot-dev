// src/frontend/features/raids/components/RaidEditForm.jsx
import React from "react";
import useRaidEdit from "../hooks/useRaidEdit";
import useRaidDetail from "../hooks/useRaidDetail";

export default function RaidEditForm({ raid: raidProp, setRaid: setRaidProp, onClose }) {
  const detail = useRaidDetail();
  const raid = raidProp ?? detail.raid ?? null;
  const setRaid = setRaidProp ?? detail.setRaid ?? (() => {});
  const close = onClose ?? detail.stopEdit ?? (() => {});

  const edit = useRaidEdit({ raid, setRaid, onUpdated: close });

  const Field = ({ label, hint, children }) => (
    <div className="space-y-1">
      {label ? <label className="text-sm font-medium">{label}</label> : null}
      {children}
      {hint ? <p className="text-xs opacity-60">{hint}</p> : null}
    </div>
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Raid bearbeiten</h3>
        <button
          onClick={close}
          className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Schließen
        </button>
      </div>

      {edit.error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
          {edit.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Titel">
          <input
            type="text"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            placeholder="Raid-Titel"
            {...edit.bind("title")}
          />
        </Field>

        <Field label="Datum & Zeit">
          <input
            type="datetime-local"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            {...edit.bind("dateTime")}
          />
        </Field>

        <Field label="Instanz">
          <input
            type="text"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            placeholder="z. B. Nerub-ar Palace"
            {...edit.bind("instance")}
          />
        </Field>

        <Field label="Schwierigkeit">
          <select
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            {...edit.bind("difficulty")}
          >
            <option value="">— auswählen —</option>
            <option value="Normal">Normal</option>
            <option value="Heroic">Heroisch</option>
            <option value="Mythic">Mythisch</option>
          </select>
        </Field>

        <Field label="Loot-Typ">
          <select
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            {...edit.bind("lootType")}
          >
            <option value="">— auswählen —</option>
            <option value="PL">Personal Loot</option>
            <option value="ML">Master Loot</option>
            <option value="VIP">VIP</option>
          </select>
        </Field>

        <Field label="Fraktion">
          <select
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            {...edit.bind("faction")}
          >
            <option value="">— auswählen —</option>
            <option value="Horde">Horde</option>
            <option value="Alliance">Allianz</option>
          </select>
        </Field>

        <Field label="Max. Spieler">
          <input
            type="number"
            min="1"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            placeholder="z. B. 20"
            {...edit.bind("maxPlayers")}
          />
        </Field>

        <Field label="Voice-Channel ID" hint="Optional: fester Voice-Channel">
          <input
            type="text"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            placeholder="123456789012345678"
            {...edit.bind("voiceChannelId")}
          />
        </Field>

        <Field label="Text-Channel ID" hint="Optional: Ankündigungs-/Roster-Channel">
          <input
            type="text"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            placeholder="123456789012345678"
            {...edit.bind("textChannelId")}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Beschreibung">
            <textarea
              rows={4}
              className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
              placeholder="Kurze Beschreibung, Hinweise …"
              {...edit.bind("description")}
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Notizen (intern)">
            <textarea
              rows={3}
              className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
              placeholder="Interne Notizen …"
              {...edit.bind("notes")}
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

        {edit.dirty && !edit.saving && (
          <span className="text-xs text-zinc-400">Nicht gespeicherte Änderungen</span>
        )}
      </div>
    </div>
  );
}

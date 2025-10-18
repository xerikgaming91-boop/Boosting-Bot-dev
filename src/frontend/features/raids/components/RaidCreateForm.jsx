<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { useMemo, useState } from "react";
=======
=======
>>>>>>> parent of 6ed4743 (Edit form fixed)
=======
>>>>>>> parent of 6ed4743 (Edit form fixed)
// src/frontend/features/raids/components/RaidCreateForm.jsx
import React from "react";
import useRaidCreateForm from "../hooks/useRaidCreateForm";

export default function RaidCreateForm({ me, leads = [], canPickLead = false, onCreate }) {
  const form = useRaidCreateForm({ me, canPickLead, onCreate });
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 6ed4743 (Edit form fixed)

/* --------- Leads robust normalisieren (egal welches Shape) ---------- */
function normalizeLeads(leads) {
  if (Array.isArray(leads)) return leads;
  if (Array.isArray(leads?.users)) return leads.users;
  if (Array.isArray(leads?.leads)) return leads.leads;
  if (leads && typeof leads === "object") {
    return Object.values(leads).filter((v) => v && typeof v === "object");
  }
  return [];
}
function getUserId(u) {
  return u?.id ?? u?.discordId ?? u?.userId ?? u?.snowflake ?? "";
}
function getUserLabel(u) {
  return (
<<<<<<< HEAD
    u?.displayName ||
    u?.username ||
    u?.global_name ||
    u?.nick ||
    u?.name ||
    u?.tag ||
    u?.discordTag ||
    getUserId(u) ||
    ""
  );
}
/* -------------------------------------------------------------------- */

export default function RaidCreateForm({ me, leads, canPickLead, onCreate }) {
  // 1) Niemals direkt 'leads' benutzen → erst normalisieren:
  const leadList = useMemo(() => normalizeLeads(leads), [leads]);

  // 2) sinnvolle Defaults
  const myId = me?.id ?? me?.discordId ?? me?.userId ?? null;
  const myAsLead = useMemo(
    () => leadList.find((u) => String(getUserId(u)) === String(myId)),
    [leadList, myId]
  );

  const initialLeadId = canPickLead
    ? (leadList[0] ? getUserId(leadList[0]) : "")
    : (myAsLead ? getUserId(myAsLead) : "");

  // 3) lokale Form-States
  const [date, setDate] = useState("");            // dein Datumsformat; Hook/Backend wandelt
  const [difficulty, setDifficulty] = useState(""); // "Normal" | "Heroic" | "Mythic"
  const [lootType, setLootType] = useState("Unsaved"); // "Saved" | "Unsaved" | "VIP"
  const [leadId, setLeadId] = useState(initialLeadId);

  // 4) Optionen für das Select
  const leadOptions = useMemo(
    () => leadList.map((u) => ({ value: getUserId(u), label: getUserLabel(u) })),
    [leadList]
  );

  // 5) Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onCreate) return;

    await onCreate({
      date,           // <- formatiere ggf. in deiner create-Hook
      difficulty,     // "Normal" | "Heroic" | "Mythic"
      lootType,       // "Saved" | "Unsaved" | "VIP"
      lead: leadId,   // nur die ID
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Datum & Zeit */}
      <div className="form-control">
        <label className="label">Datum & Zeit</label>
        <input
          type="text"                // nutze hier dein bisheriges Feld (z. B. datetime-local, text, etc.)
          className="input"
          placeholder="tt.mm.jjjj --:--"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Schwierigkeit */}
      <div className="form-control">
        <label className="label">Schwierigkeit</label>
        <select
          className="select"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">— auswählen —</option>
          <option value="Normal">Normal</option>
          <option value="Heroic">Heroic</option>
          <option value="Mythic">Mythic</option>
        </select>
      </div>

      {/* Loot-Type */}
      <div className="form-control">
        <label className="label">Loot-Type</label>
        <select
          className="select"
          value={lootType}
          onChange={(e) => setLootType(e.target.value)}
        >
          <option value="Unsaved">Unsaved</option>
          <option value="Saved">Saved</option>
          <option value="VIP">VIP</option>
        </select>
      </div>

      {/* Raidleads */}
      <div className="form-control">
        <label className="label">Raidlead</label>
        <select
          className="select"
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
          disabled={!canPickLead && !myAsLead} // frei wählen nur Admin/Owner
        >
          <option value="">— auswählen —</option>
          {leadOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
=======
=======

  return (
>>>>>>> parent of 6ed4743 (Edit form fixed)
=======

  return (
>>>>>>> parent of 6ed4743 (Edit form fixed)
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => { e.preventDefault(); form.submit(); }}
    >
      {/* Fehleranzeige */}
      {!!form.error && (
        <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-rose-700 bg-rose-900/40 px-3 py-2 text-rose-200">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm">{form.error}</div>
            <button
              type="button"
              onClick={form.clearError}
              className="rounded bg-rose-700/40 px-2 py-1 text-xs hover:bg-rose-700/60"
              title="Fehlermeldung schließen"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Automatisch generierter Titel (read-only Preview) */}
      <div className="lg:col-span-3">
        <label className="mb-1 block text-xs text-zinc-400">Titel (automatisch)</label>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200"
          value={form.autoTitle}
          readOnly
          title="Titel wird aus Name, Difficulty, Loot und ggf. Bossfortschritt (Mythic) generiert."
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">Datum & Zeit</label>
        <input
          type="datetime-local"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={form.date}
          onChange={(e) => form.setDate(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">Difficulty</label>
        <select
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={form.difficulty}
          onChange={(e) => form.setDifficulty(e.target.value)}
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
          value={form.lootType}
          onChange={(e) => form.setLootType(e.target.value)}
          disabled={form.isMythic}
        >
          {form.lootOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 6ed4743 (Edit form fixed)
=======
>>>>>>> parent of 6ed4743 (Edit form fixed)
=======
>>>>>>> parent of 6ed4743 (Edit form fixed)
          ))}
        </select>
      </div>

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      <div className="col-span-1 md:col-span-2 flex gap-2 mt-2">
        <button type="submit" className="btn btn-primary">Speichern</button>
        <button type="button" className="btn">Abbrechen</button>
=======
=======
>>>>>>> parent of 6ed4743 (Edit form fixed)
=======
>>>>>>> parent of 6ed4743 (Edit form fixed)
      {/* Bosse: nur bei Mythic editierbar; bei HC/Normal fix 8 */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Bosses</label>
        {form.isMythic ? (
          <input
            type="number"
            min={1}
            max={8}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={form.bosses}
            onChange={(e) => form.setBosses(e.target.value)}
            required
          />
        ) : (
          <input
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-400"
            value={8}
            readOnly
            title="Bei Heroic/Normal ist die Bossanzahl fest 8."
          />
        )}
      </div>

      {canPickLead ? (
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Raidlead</label>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={form.lead}
            onChange={(e) => form.setLead(e.target.value)}
          >
            <option value="">– auswählen –</option>
            {leads.map((u) => {
              const value = u.discordId || String(u.id);
              const name = u.displayName || u.username || u.globalName || value;
              return <option key={value} value={value}>{name}</option>;
            })}
          </select>
        </div>
      ) : (
        <div className="opacity-60">
          <label className="mb-1 block text-xs text-zinc-400">Raidlead</label>
          <input
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-400"
            value={me?.displayName || me?.username || me?.discordId || me?.id || ""}
            readOnly
          />
        </div>
      )}

      <div className="sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={form.submitting}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {form.submitting ? "Erstelle …" : "Raid erstellen"}
        </button>
>>>>>>> parent of 6ed4743 (Edit form fixed)
      </div>
    </form>
  );
}

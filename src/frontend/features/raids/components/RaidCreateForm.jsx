import { useMemo, useState } from "react";

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
          ))}
        </select>
      </div>

      <div className="col-span-1 md:col-span-2 flex gap-2 mt-2">
        <button type="submit" className="btn btn-primary">Speichern</button>
        <button type="button" className="btn">Abbrechen</button>
      </div>
    </form>
  );
}

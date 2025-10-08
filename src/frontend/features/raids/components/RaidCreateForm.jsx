// src/frontend/features/raids/components/RaidCreateForm.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * Props:
 * - me:           Session-User { discordId, id, ... }
 * - leads:        Array<User> (für Auswahl)
 * - canPickLead:  boolean (nur Owner/Admin)
 * - onCreate:     (payload) => Promise<Raid>
 * - loading:      boolean
 */
export default function RaidCreateForm({ me, leads = [], canPickLead = false, onCreate, loading = false }) {
  const DEFAULT_RAID_NAME =
    (import.meta?.env?.VITE_DEFAULT_RAID_NAME || "Manaforge").toString().trim() || "Manaforge";

  // "HC" | "Mythic" | "Normal"
  const [difficulty, setDifficulty] = useState("HC");
  // Loot-Typ Werte: "vip" | "saved" | "unsaved"
  const [lootType, setLootType] = useState("vip");
  const [date, setDate] = useState(""); // datetime-local
  const [bosses, setBosses] = useState(8); // HC/Normal = 8
  const [lead, setLead] = useState("");

  const isMythic = difficulty === "Mythic";

  // Wenn Difficulty auf Mythic umspringt → Bosse frei wählen (Default 1),
  // ansonsten Bosse immer 8.
  useEffect(() => {
    if (isMythic) {
      if (!Number(bosses) || Number(bosses) < 1) setBosses(1);
      // bei Mythic ist nur VIP erlaubt
      setLootType("vip");
    } else {
      setBosses(8);
      // falls bisher ein nicht erlaubter Wert gesetzt wäre (z.B. aus anderer UI),
      // für HC/Normal lassen wir "vip" als Default bestehen; der User kann Saved/Unsaved wählen.
      if (!["vip", "saved", "unsaved"].includes(lootType)) {
        setLootType("vip");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMythic]);

  // erlaubte Loot-Optionen je Difficulty
  const lootOptions = useMemo(() => {
    return isMythic
      ? [{ value: "vip", label: "VIP" }]
      : [
          { value: "saved", label: "Saved" },
          { value: "unsaved", label: "Unsaved" },
          { value: "vip", label: "VIP" },
        ];
  }, [isMythic]);

  function labelDifficulty(d) {
    if (d === "HC") return "HC";
    if (d === "Mythic") return "Mythic";
    return "Normal";
  }
  function labelLoot(t) {
    if (t === "vip") return "VIP";
    if (t === "saved") return "Saved";
    if (t === "unsaved") return "Unsaved";
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
  }

  // Titel automatisch bauen
  const autoTitle = useMemo(() => {
    const diff = labelDifficulty(difficulty);
    const loot = labelLoot(lootType);
    if (isMythic) {
      const b = Math.max(1, Number(bosses) || 1);
      return `${DEFAULT_RAID_NAME} ${diff} ${loot} ${b}/8`;
    }
    return `${DEFAULT_RAID_NAME} ${diff} ${loot}`;
  }, [DEFAULT_RAID_NAME, difficulty, lootType, bosses, isMythic]);

  async function handleSubmit(e) {
    e.preventDefault();

    const when = date ? new Date(date) : new Date();
    const payload = {
      title: autoTitle,                   // automatisch generiert
      difficulty: difficulty || "HC",
      lootType: lootType || "vip",
      date: when.toISOString(),
      bosses: isMythic ? Number(bosses) || 8 : 8,
      // Lead:
      lead: canPickLead
        ? (lead || "").trim()
        : (me?.discordId || String(me?.id || "") || "").trim(),
    };

    const created = await onCreate?.(payload);
    if (created) {
      // Reset auf Defaults
      setDifficulty("HC");
      setLootType("vip");
      setDate("");
      setBosses(8);
      if (canPickLead) setLead("");
    }
  }

  return (
    <form className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleSubmit}>
      {/* Automatisch generierter Titel (read-only Preview) */}
      <div className="lg:col-span-3">
        <label className="mb-1 block text-xs text-zinc-400">Titel (automatisch)</label>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200"
          value={autoTitle}
          readOnly
          title="Titel wird aus Name, Difficulty, Loot und ggf. Bossfortschritt (Mythic) generiert."
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">Datum & Zeit</label>
        <input
          type="datetime-local"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={date}
          onChange={(e) => setDate(e.target.value)}
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
          disabled={isMythic} // bei Mythic gibt's nur VIP (bereits via useEffect gesetzt)
        >
          {lootOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bosse: nur bei Mythic editierbar; bei HC/Normal fix 8 */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Bosses</label>
        {isMythic ? (
          <input
            type="number"
            min={1}
            max={20}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={bosses}
            onChange={(e) => setBosses(e.target.value)}
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
            value={lead}
            onChange={(e) => setLead(e.target.value)}
          >
            <option value="">– auswählen –</option>
            {leads.map((u) => {
              const value = u.discordId || String(u.id);
              const name = u.displayName || u.username || u.globalName || value;
              return (
                <option key={value} value={value}>
                  {name}
                </option>
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
            value={me?.displayName || me?.username || me?.discordId || me?.id || ""}
            readOnly
          />
        </div>
      )}

      <div className="sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {loading ? "Erstelle …" : "Raid erstellen"}
        </button>
      </div>
    </form>
  );
}

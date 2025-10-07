// src/frontend/features/raids/components/RaidCreateForm.jsx
import React, { useState } from "react";

/**
 * Props:
 * - me:           Session-User { discordId, id, ... }
 * - leads:        Array<User> (für Auswahl)
 * - canPickLead:  boolean (nur Owner/Admin)
 * - onCreate:     (payload) => Promise<Raid>
 * - loading:      boolean
 */
export default function RaidCreateForm({ me, leads = [], canPickLead = false, onCreate, loading = false }) {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("HC");
  const [lootType, setLootType] = useState("vip");
  const [date, setDate] = useState(""); // datetime-local
  const [bosses, setBosses] = useState(0);
  const [lead, setLead] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const when = date ? new Date(date) : new Date();
    const payload = {
      title: title.trim(),
      difficulty: difficulty || "HC",
      lootType: lootType || "vip",
      date: when.toISOString(),
      bosses: Number(bosses) || 0,
      // Lead:
      lead: canPickLead
        ? (lead || "").trim()
        : (me?.discordId || String(me?.id || "") || "").trim(),
    };

    // falls kein Title
    if (!payload.title) return;

    const created = await onCreate?.(payload);
    // reset optional
    if (created) {
      setTitle("");
      setBosses(0);
      if (canPickLead) setLead("");
    }
  }

  return (
    <form className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Titel</label>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Manaforge Heroic VIP"
          required
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
        >
          <option value="vip">VIP</option>
          <option value="community">Community</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">Bosses</label>
        <input
          type="number"
          min={0}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={bosses}
          onChange={(e) => setBosses(e.target.value)}
        />
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

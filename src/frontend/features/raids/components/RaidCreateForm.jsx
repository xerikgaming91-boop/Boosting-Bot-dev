// src/frontend/features/raids/components/RaidCreateForm.jsx
import React, { useEffect, useMemo, useState } from "react";

// UI Klassen
const card =
  "rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]";
const sectionTitle =
  "text-sm font-semibold uppercase tracking-wide text-zinc-300/90";
const inputBase =
  "w-full rounded-xl border border-zinc-700/60 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500";
const selectBase = inputBase;
const helpText = "text-[11px] text-zinc-400 mt-1";
const label = "text-xs font-medium text-zinc-300 mb-1 block";
const btnPrimary =
  "inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-3.5 py-2 text-sm font-semibold shadow-sm transition-colors";

// Vorgaben
const DIFFICULTIES = ["NHC", "HC", "Mythic"];
const LOOT_OPTIONS = [
  { value: "saved", label: "Saved" },
  { value: "unsaved", label: "Unsaved" },
  { value: "vip", label: "VIP" },
];

export default function RaidCreateForm({
  presets = [],
  leads = [],
  onCreate,
  defaultLeadId = null,
}) {
  const [form, setForm] = useState({
    presetId: "",
    date: "",
    time: "",
    difficulty: "HC",
    lootType: "vip",
    leadId: defaultLeadId || "",
    mythicBosses: 1,
  });

  // aktives Preset + Dungeon-Basis (erstes Wort) oder Default
  const activePreset = useMemo(
    () => presets.find((p) => String(p.id) === String(form.presetId)) || null,
    [presets, form.presetId]
  );
  const base = useMemo(() => {
    if (activePreset?.name) {
      const tok = activePreset.name.trim().split(/\s+/)[0];
      if (tok) return tok;
    }
    return "Manaforge";
  }, [activePreset]);

  // Live-Titel-Vorschau (Backend generiert final!)
  const previewTitle = useMemo(() => {
    const diff = form.difficulty;
    const loot = (LOOT_OPTIONS.find((o) => o.value === form.lootType)?.label) ?? form.lootType;
    if (diff === "Mythic") {
      return `${base} Mythic ${loot} ${form.mythicBosses}/8`;
    }
    return `${base} ${diff} ${loot}`;
  }, [base, form.difficulty, form.lootType, form.mythicBosses]);

  function patch(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!onCreate) return;

    if (!form.date || !form.time) {
      alert("Bitte Datum und Uhrzeit angeben.");
      return;
    }
    if (!form.leadId) {
      alert("Bitte einen Raidlead auswählen.");
      return;
    }

    // ISO-Zeit bauen (Browser-Lokalzeit → ISO; finale TZ-Logik kann Server übernehmen)
    const [hh, mm] = (form.time || "").split(":").map((v) => parseInt(v, 10));
    const when = new Date(
      `${form.date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(
        2,
        "0"
      )}:00`
    );

    const payload = {
      base, // Dungeon-Basis
      presetId: form.presetId ? Number(form.presetId) : null,
      difficulty: form.difficulty, // "NHC"|"HC"|"Mythic"
      lootType: form.lootType, // "saved"|"unsaved"|"vip"
      bosses: form.difficulty === "Mythic" ? Number(form.mythicBosses) : 8,
      date: when.toISOString(),
      lead: form.leadId, // z. B. Discord-ID
    };

    await onCreate(payload);
  }

  // Wenn Difficulty von Mythic weggeht, sicherheitshalber Bosse wieder auf 8
  useEffect(() => {
    if (form.difficulty !== "Mythic" && form.mythicBosses !== 8) {
      setForm((f) => ({ ...f, mythicBosses: 8 }));
    }
    if (form.difficulty === "Mythic" && (form.mythicBosses < 1 || form.mythicBosses > 8)) {
      setForm((f) => ({ ...f, mythicBosses: 1 }));
    }
  }, [form.difficulty]);

  return (
    <form onSubmit={handleSubmit} className={`${card} p-5 md:p-6`}>
      <div className="mb-4 pb-4 border-b border-zinc-800/80">
        <h2 className={sectionTitle}>Raid erstellen</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Titel (read-only Preview) */}
        <div className="col-span-1">
          <label className={label}>Titel (automatisch)</label>
          <input className={inputBase} value={previewTitle} readOnly />
          <p className={helpText}>
            Finaler Titel wird serverseitig generiert (z. B.{" "}
            <code>Manaforge HC VIP</code> oder{" "}
            <code>Manaforge Mythic VIP 2/8</code>).
          </p>
        </div>

        {/* Datum/Zeit */}
        <div className="col-span-1 grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Datum</label>
            <input
              type="date"
              className={inputBase}
              value={form.date}
              onChange={(e) => patch("date", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Uhrzeit</label>
            <input
              type="time"
              className={inputBase}
              value={form.time}
              onChange={(e) => patch("time", e.target.value)}
            />
          </div>
        </div>

        {/* Loot */}
        <div>
          <label className={label}>Loot</label>
          <select
            className={selectBase}
            value={form.lootType}
            onChange={(e) => patch("lootType", e.target.value)}
          >
            {LOOT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty + Bosse */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Difficulty</label>
            <select
              className={selectBase}
              value={form.difficulty}
              onChange={(e) => patch("difficulty", e.target.value)}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {form.difficulty === "Mythic" ? (
            <div>
              <label className={label}>Bosse (Mythic)</label>
              <select
                className={selectBase}
                value={String(form.mythicBosses)}
                onChange={(e) => patch("mythicBosses", Number(e.target.value))}
              >
                {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}/8
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className={label}>Bosse</label>
              <input className={inputBase} value="8" disabled />
            </div>
          )}
        </div>

        {/* Lead */}
        <div>
          <label className={label}>Raid Lead</label>
          <select
            className={selectBase}
            value={form.leadId}
            onChange={(e) => patch("leadId", e.target.value)}
          >
            <option value="">— auswählen —</option>
            {leads.map((l) => (
              <option key={l.id || l.discordId} value={l.id || l.discordId}>
                {l.displayName || l.username || l.discordId}
              </option>
            ))}
          </select>
          <p className={helpText}>Nur Lead/Admin/Owner erscheinen hier.</p>
        </div>

        {/* Preset */}
        <div>
          <label className={label}>Preset</label>
          <select
            className={selectBase}
            value={form.presetId}
            onChange={(e) => patch("presetId", e.target.value)}
          >
            <option value="">— Kein Preset —</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className={helpText}>
            Dungeon-Name wird aus dem Preset (erstes Wort) übernommen. Ohne
            Preset: <span className="font-medium">Manaforge</span>.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <button type="submit" className={btnPrimary}>
          Raid erstellen
        </button>
      </div>
    </form>
  );
}

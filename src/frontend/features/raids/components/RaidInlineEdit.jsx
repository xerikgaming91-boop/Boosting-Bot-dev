// src/frontend/features/raids/components/RaidInlineEdit.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGetLeads, apiGetMe } from "@app/api/usersAPI";
import { apiUpdateRaid } from "@app/api/raidsAPI";

const DEFAULT_RAID_NAME = import.meta.env.VITE_DEFAULT_RAID_NAME || "Manaforge";

function toInputLocal(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const da = pad(d.getDate());
    const h = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${y}-${m}-${da}T${h}:${mi}`;
  } catch {
    return "";
  }
}

function buildTitle({ base = DEFAULT_RAID_NAME, difficulty, lootType, bosses }) {
  const diff = String(difficulty || "").toUpperCase();
  const loot = String(lootType || "").toUpperCase();
  if (diff === "MYTHIC") {
    const b = Number(bosses) > 0 ? ` ${bosses}/8` : "";
    return `${base} Mythic ${loot}${b}`.trim();
  }
  const diffPretty = diff === "HC" ? "HC" : "Normal";
  return `${base} ${diffPretty} ${loot}`.trim();
}

function lootOptionsFor(diff) {
  const d = String(diff || "").toUpperCase();
  if (d === "MYTHIC") return [{ value: "vip", label: "VIP" }];
  return [
    { value: "vip", label: "VIP" },
    { value: "saved", label: "Saved" },
    { value: "unsaved", label: "Unsaved" },
  ];
}

/**
 * Props:
 * - raid: { id, title, date, difficulty, lootType, bosses, lead }
 * - onSaved(updatedRaid)
 * - onCancel()
 */
export default function RaidInlineEdit({ raid, onSaved, onCancel }) {
  const [me, setMe] = useState(null);
  const [leads, setLeads] = useState([]);

  const [title, setTitle] = useState(raid?.title || "");
  const [difficulty, setDifficulty] = useState(raid?.difficulty || "HC");
  const [lootType, setLootType] = useState(raid?.lootType || "vip");
  const [dateLocal, setDateLocal] = useState(toInputLocal(raid?.date));
  const [bosses, setBosses] = useState(
    Number.isFinite(Number(raid?.bosses)) ? Number(raid.bosses) : 8
  );
  const [lead, setLead] = useState(raid?.lead || "");
  const [autoTitle, setAutoTitle] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Rechte: Lead nur Owner/Admin änderbar
  const canPickLead = useMemo(() => {
    const rl = me?.roleLevel ?? 0;
    return !!me && (me.isOwner || me.isAdmin || rl >= 2);
  }, [me]);

  const lootOptions = useMemo(() => lootOptionsFor(difficulty), [difficulty]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [meRes, leadsRes] = await Promise.all([
          apiGetMe().catch(() => ({ user: null })),
          apiGetLeads().catch(() => ({ leads: [] })),
        ]);
        if (!alive) return;
        setMe(meRes?.user || null);
        setLeads(leadsRes?.leads || []);
      } catch (_) {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // HC/Normal -> Bosse 8; Loot-Options ggf. korrigieren
  useEffect(() => {
    const diff = String(difficulty || "").toUpperCase();
    if (diff !== "MYTHIC") {
      setBosses(8);
      const allowed = lootOptionsFor(diff).map((o) => o.value);
      if (!allowed.includes(lootType)) setLootType("vip");
    }
  }, [difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoTitle) return;
    setTitle(buildTitle({ difficulty, lootType, bosses }));
  }, [autoTitle, difficulty, lootType, bosses]);

  const canSave = Boolean(title?.trim()) && Boolean(dateLocal);

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const patch = {
        title: title.trim(),
        difficulty,
        lootType,
        date: new Date(dateLocal).toISOString(),
        bosses: Number(bosses) || 0,
        ...(canPickLead ? { lead: (lead || "").trim() } : {}),
      };
      const res = await apiUpdateRaid(raid.id, patch);
      const updated = res?.raid || res || null;
      onSaved?.(updated);
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium text-zinc-400">Raid bearbeiten</div>
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
            onClick={handleSave}
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? "Speichere …" : "Speichern"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded-md border border-rose-800/50 bg-rose-950/40 p-2 text-xs text-rose-300">
          Konnte nicht speichern.
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
              onClick={() =>
                setTitle(buildTitle({ difficulty, lootType, bosses }))
              }
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
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
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
            <p className="mt-1 text-[11px] text-zinc-400">
              Bei HC/Normal ist 8 gesetzt.
            </p>
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
                const name =
                  u.displayName || u.username || u.globalName || value;
                return (
                  <option key={value} value={value}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}

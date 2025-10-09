// src/frontend/features/raids/hooks/useRaidEditForm.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetRaidById, apiUpdateRaid } from "@app/api/raidsAPI";
import { apiGetLeads, apiGetMe } from "@app/api/usersAPI";

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
    const b = Number.isFinite(Number(bosses)) && Number(bosses) > 0 ? ` ${bosses}/8` : "";
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

export default function useRaidEditForm(raidId) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  // Rechte + Leads
  const [me, setMe]       = useState(null);
  const [leads, setLeads] = useState([]);

  // Form-State
  const [title, setTitle]           = useState("");
  const [difficulty, setDifficulty] = useState("HC");
  const [lootType, setLootType]     = useState("vip");
  const [dateLocal, setDateLocal]   = useState("");
  const [bosses, setBosses]         = useState(8);
  const [lead, setLead]             = useState("");
  const [autoTitle, setAutoTitle]   = useState(false);

  const lootOptions = useMemo(() => lootOptionsFor(difficulty), [difficulty]);

  const canPickLead = useMemo(() => {
    const rl = me?.roleLevel ?? 0;
    return !!me && (me.isOwner || me.isAdmin || rl >= 2); // Owner/Admin
  }, [me]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, leadsRes, raidRes] = await Promise.all([
        apiGetMe().catch(() => ({ user: null })),
        apiGetLeads().catch(() => ({ leads: [] })),
        apiGetRaidById(raidId),
      ]);

      setMe(meRes?.user || null);
      setLeads(leadsRes?.leads || []);

      const raw = raidRes?.raid || raidRes || null;
      setTitle(raw?.title || "");
      setDifficulty(raw?.difficulty || "HC");
      setLootType(raw?.lootType || "vip");
      setDateLocal(toInputLocal(raw?.date));
      setBosses(Number.isFinite(Number(raw?.bosses)) ? Number(raw.bosses) : 8);
      setLead(raw?.lead || "");
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [raidId]);

  useEffect(() => { load(); }, [load]);

  // HC/Normal: Bosse = 8 und Loot ggf. korrigieren
  useEffect(() => {
    const diff = String(difficulty || "").toUpperCase();
    if (diff !== "MYTHIC") {
      setBosses(8);
      const allowed = lootOptionsFor(diff).map(o => o.value);
      if (!allowed.includes(lootType)) setLootType("vip");
    }
  }, [difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoTitle) return;
    setTitle(buildTitle({ difficulty, lootType, bosses }));
  }, [autoTitle, difficulty, lootType, bosses]);

  const canSave = useMemo(
    () => Boolean(title?.trim()) && Boolean(dateLocal),
    [title, dateLocal]
  );

  async function submit() {
    if (!canSave || saving) return null;
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
      const updated = await apiUpdateRaid(raidId, patch);
      return updated?.raid || updated || null;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setSaving(false);
    }
  }

  function regenerateTitle() {
    setTitle(buildTitle({ difficulty, lootType, bosses }));
  }

  return {
    loading, saving, error,
    me, leads, canPickLead,
    title, setTitle,
    difficulty, setDifficulty,
    lootType, setLootType,
    dateLocal, setDateLocal,
    bosses, setBosses,
    lead, setLead,
    autoTitle, setAutoTitle,
    lootOptions,
    canSave,
    submit,
    regenerateTitle,
    reload: load,
  };
}

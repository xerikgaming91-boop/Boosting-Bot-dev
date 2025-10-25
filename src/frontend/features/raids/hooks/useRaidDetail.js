// src/frontend/features/raids/hooks/useRaidDetail.js
import { useEffect, useMemo, useState } from "react";
import { apiListRaidSignups, apiPickSignup, apiUnpickSignup } from "../../../app/api/signupsAPI";
import { apiGetPresetById } from "../../../app/api/presetsAPI";

const U = (x) => String(x || "").toUpperCase();
const L = (x) => String(x || "").toLowerCase();

function fmtDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelDiff(d) {
  const v = U(d);
  if (v === "HC") return "Heroic";
  if (v === "NORMAL" || v === "NHC") return "Normal";
  if (v === "MYTHIC") return "Mythic";
  return d || "-";
}
function labelLoot(l) {
  const v = L(l);
  if (v === "saved") return "Saved";
  if (v === "unsaved") return "Unsaved";
  if (v === "vip") return "VIP";
  return l || "-";
}

// Lead-Label: DisplayName → Username → ID
function preferLeadName(raid) {
  return raid?.leadDisplayName || raid?.leadUsername || raid?.lead || "-";
}

function roleKey(t) {
  const v = L(t);
  if (v.startsWith("tank")) return "tanks";
  if (v.startsWith("heal")) return "heals";
  if (v.startsWith("dps")) return "dps";
  if (v.startsWith("loot")) return "loot";
  return "dps";
}

/** Preset→Caps robust normalisieren (unterstützt mehrere Shapes) */
function deriveCaps(preset) {
  if (!preset) return null;

  // Direkt-Felder
  const tanks =
    Number(preset.tanks ?? preset.tank ?? preset.maxTanks ?? 0) || 0;
  const heals =
    Number(preset.healers ?? preset.heals ?? preset.heal ?? preset.maxHeals ?? 0) || 0;
  const dps =
    Number(preset.dps ?? preset.maxDps ?? 0) || 0;
  const loot =
    Number(
      preset.lootbuddies ??
        preset.lootBuddies ??
        preset.lootbuddy ??
        preset.loot ??
        preset.maxLootbuddies ??
        0
    ) || 0;

  let caps = { tanks, heals, dps, loot };

  // Rollenliste wie [{role:'tank', count:2}, ...]
  if (Array.isArray(preset.roles)) {
    const rmap = { ...caps };
    preset.roles.forEach((r) => {
      const key = roleKey(r.role || r.type);
      const cnt = Number(r.count ?? r.max ?? r.value ?? 0) || 0;
      rmap[key] = Math.max(rmap[key] || 0, cnt);
    });
    caps = rmap;
  }

  const total = (caps.tanks || 0) + (caps.heals || 0) + (caps.dps || 0) + (caps.loot || 0);
  return { ...caps, total };
}

export default function useRaidDetail(raidId) {
  const [raid, setRaid] = useState(null);
  const [preset, setPreset] = useState(null);
  const [signups, setSignups] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState("");
  const [busyIds, setBusyIds] = useState(() => new Set());

  useEffect(() => {
    if (!raidId || Number.isNaN(raidId)) return;
    const ac = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");
      try {
        // Raid
        let r = await fetch(`/api/raids/${raidId}`, {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        if (r.status === 304) {
          r = await fetch(`/api/raids/${raidId}?_=${Date.now()}`, {
            credentials: "include",
            cache: "no-store",
            signal: ac.signal,
          });
        }
        const raidJson = await r.json();
        if (!r.ok || !raidJson?.ok) throw new Error(raidJson?.error || `HTTP_${r.status}`);
        const rdata = raidJson.raid || null;
        setRaid(rdata);

        // Preset (falls vorhanden)
        setPreset(null);
        if (rdata?.presetId != null) {
          try {
            const p = await apiGetPresetById(rdata.presetId);
            setPreset(p || null);
          } catch {
            setPreset(null);
          }
        }

        // Me
        const meRes = await fetch(`/api/users/me`, {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        const meJson = meRes.ok ? await meRes.json() : {};
        setMe(meJson?.user || null);

        // Signups
        const list = await apiListRaidSignups(raidId);
        setSignups(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!ac.signal.aborted) setErr(e?.message || "LOAD_FAILED");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => ac.abort();
  }, [raidId]);

  const canManage = useMemo(() => {
    if (!raid || !me) return false;
    const isLead = String(raid.lead || "") === String(me.discordId || me.id || "");
    return !!(me.isOwner || me.isAdmin || isLead);
  }, [raid, me]);

  const raidView = useMemo(() => {
    if (!raid) return null;
    return {
      id: raid.id,
      title: raid.title || "-",
      dateLabel: fmtDate(raid.date),
      diffLabel: labelDiff(raid.difficulty),
      lootLabel: labelLoot(raid.lootType),
      bosses: raid.bosses ?? "-",
      leadLabel: preferLeadName(raid),
    };
  }, [raid]);

  const grouped = useMemo(() => {
    const base = () => ({ tanks: [], heals: [], dps: [], loot: [] });
    const g = { saved: base(), open: base() };

    (signups || []).forEach((s) => {
      const k = roleKey(s.type);
      const picked = s.saved || U(s.status) === "PICKED";

      const item = {
        id: s.id,
        who: s.char?.name
          ? `${s.char.name}${s.char.realm ? "-" + s.char.realm : ""}`
          : (s.displayName || s.userId || "-"),
        classLabel: s.char?.class || s.class || "",
        roleLabel: U(s.type || "-"),
        itemLevel: s.char?.itemLevel ?? null,
        note: s.note || "",
        saved: !!picked,
        statusLabel: U(s.status || "-"),
      };

      if (picked) g.saved[k].push(item);
      else g.open[k].push(item);
    });

    return g;
  }, [signups]);

  // Caps & Counts
  const caps = useMemo(() => deriveCaps(preset), [preset]);

  const counts = useMemo(() => {
    const r = {
      tanks: grouped.saved.tanks.length,
      heals: grouped.saved.heals.length,
      dps: grouped.saved.dps.length,
      loot: grouped.saved.loot.length,
    };
    const s = {
      tanks: grouped.open.tanks.length,
      heals: grouped.open.heals.length,
      dps: grouped.open.dps.length,
      loot: grouped.open.loot.length,
    };
    const rTotal = r.tanks + r.heals + r.dps + r.loot;
    const sTotal = s.tanks + s.heals + s.dps + s.loot;
    return { roster: { ...r, total: rTotal }, signups: { ...s, total: sTotal } };
  }, [grouped]);

  async function pick(id) {
    if (!id) return;
    setBusyIds((s) => new Set([...s, id]));
    try {
      await apiPickSignup(id);
      setSignups((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "PICKED", saved: true } : s))
      );
    } catch (e) {
      console.error("pick failed", e);
      setErr(e?.message || "PICK_FAILED");
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  async function unpick(id) {
    if (!id) return;
    setBusyIds((s) => new Set([...s, id]));
    try {
      await apiUnpickSignup(id);
      setSignups((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "SIGNUPED", saved: false } : s))
      );
    } catch (e) {
      console.error("unpick failed", e);
      setErr(e?.message || "UNPICK_FAILED");
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  return {
    raid: raidView,
    grouped,
    caps,
    counts,
    canManage,
    loading,
    error,
    pick,
    unpick,
    busyIds,
  };
}

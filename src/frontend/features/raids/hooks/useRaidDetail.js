// src/frontend/features/raids/hooks/useRaidDetail.js
import { useEffect, useMemo, useState } from "react";
import { apiListRaidSignups, apiPickSignup, apiUnpickSignup } from "../../../app/api/signupsAPI";

const U = (x) => String(x || "").toUpperCase();
const L = (x) => String(x || "").toLowerCase();

function labelDiff(d) {
  const v = U(d);
  if (v === "HC") return "Heroic";
  if (v === "NORMAL" || v === "NHC") return "Normal";
  if (v === "MYTHIC") return "Mythic";
  return d || "-";
}
function labelLoot(l) {
  const v = L(l);
  if (v === "vip") return "VIP";
  if (v === "saved") return "Saved";
  if (v === "unsaved") return "UnSaved";
  return l || "-";
}
function fmtDate(iso) {
  try { const d = new Date(iso); return isNaN(d) ? "-" : d.toLocaleString(); }
  catch { return "-"; }
}
function preferLeadName(raid) {
  return raid?.leadDisplayName || raid?.leadUsername || raid?.lead || "-";
}
function roleKey(t) {
  const v = L(t);
  if (v.startsWith("tank")) return "tanks";
  if (v.startsWith("heal")) return "heals";
  if (v.startsWith("dps"))  return "dps";
  if (v.startsWith("loot")) return "loot";
  return "dps";
}

export default function useRaidDetail(raidId) {
  const [raid, setRaid] = useState(null);
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
        // --- RAID ---
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
        const rj = await r.json().catch(() => ({}));
        if (!r.ok || !rj?.ok) throw new Error(rj?.error || `HTTP_${r.status}`);
        setRaid(rj.raid || null);

        // --- ME ---
        let m = await fetch(`/api/users/me?_=${Date.now()}`, {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        const mj = await m.json().catch(() => ({}));
        if (m.ok && mj?.ok) setMe(mj.user || null);

        // --- SIGNUPS ---
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
        note: s.note || "",
        saved: !!picked,
        statusLabel: U(s.status || "-"),
      };
      if (picked) g.saved[k].push(item);
      else g.open[k].push(item);
    });
    return g;
  }, [signups]);

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
      setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });
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
      setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  return { raid: raidView, grouped, canManage, loading, error, pick, unpick, busyIds };
}

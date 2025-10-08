// src/frontend/features/raids/hooks/useRaidDetail.js
import { useEffect, useMemo, useState } from "react";
import { apiGetRaidById } from "@app/api/raidsAPI";
import {
  apiListRaidSignups,
  apiPickSignup,
  apiUnpickSignup,
} from "@app/api/signupsAPI";
import { apiGetMe } from "@app/api/usersAPI";

// ---------- Helpers: Labels & Mapping ----------
const U = (x) => String(x ?? "").toUpperCase();
const L = (x) => String(x ?? "").toLowerCase();

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
  try {
    const d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return "-";
    return d.toLocaleString();
  } catch {
    return "-";
  }
}
function roleKey(type) {
  const v = L(type);
  if (v.startsWith("tank")) return "tanks";
  if (v.startsWith("heal")) return "heals";
  if (v.startsWith("dps")) return "dps";
  if (v.startsWith("loot")) return "loot";
  return "dps";
}

function toViewRaid(raid) {
  if (!raid) return null;
  const leadLabel =
    raid.leadDisplayName ||
    raid.leadUsername ||
    raid.leadName ||
    raid.lead ||
    "-";

  return {
    id: raid.id,
    title: raid.title || "-",
    dateLabel: fmtDate(raid.date),
    diffLabel: labelDiff(raid.difficulty),
    lootLabel: labelLoot(raid.lootType),
    bosses: Number.isFinite(Number(raid.bosses)) ? raid.bosses : "-",
    leadLabel,
  };
}

// ---- Signups: tolerant auf API-Formate ----
// Erlaubt:
//  - Array<Signup>
//  - { picked: [], pending: [] }
//  - { ok:true, picked:[], pending:[] } / { ok:true, signups:[] }
function normalizeSignupsPayload(payload) {
  if (!payload) return { picked: [], pending: [] };

  // { ok, picked, pending }
  if (Array.isArray(payload.picked) || Array.isArray(payload.pending)) {
    return {
      picked: payload.picked || [],
      pending: payload.pending || [],
    };
  }

  // { ok, signups: [] } oder direkt []
  const list = Array.isArray(payload.signups)
    ? payload.signups
    : Array.isArray(payload)
    ? payload
    : [];

  // Wenn keine Status-Info: alles pending
  return { picked: [], pending: list };
}

function groupForView(signups) {
  const base = () => ({ tanks: [], heals: [], dps: [], loot: [] });
  const grouped = { saved: base(), open: base() };

  const pushItem = (bucket, s) => {
    const rk = roleKey(s.type || s.role || s.class || "dps");
    const label =
      s.char?.name
        ? `${s.char.name}${s.char.realm ? "-" + s.char.realm : ""}`
        : s.displayName || s.userId || "-";
    bucket[rk].push({
      id: s.id,
      who: label,
      classLabel: s.char?.class || s.class || "",
      roleLabel: U(s.type || s.role || s.class || "-"),
      note: s.note || "",
    });
  };

  (signups.picked || []).forEach((s) => pushItem(grouped.saved, s));
  (signups.pending || []).forEach((s) => pushItem(grouped.open, s));
  return grouped;
}

// ---------- Hook ----------
export default function useRaidDetail(raidId) {
  const [raid, setRaid] = useState(null);        // VIEW-Form
  const [grouped, setGrouped] = useState(null);  // { saved:{...}, open:{...} }
  const [me, setMe] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState("");
  const [busyIds, setBusyIds] = useState(() => new Set());

  // load
  useEffect(() => {
    if (!raidId) return;
    let aborted = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const [raidRaw, meRes, signupsRaw] = await Promise.all([
          apiGetRaidById(raidId),
          apiGetMe().catch(() => ({ user: null })),
          apiListRaidSignups(raidId),
        ]);

        if (aborted) return;

        // Raid → View
        setRaid(toViewRaid(raidRaw?.raid || raidRaw));

        // Me
        setMe(meRes?.user || null);

        // Signups normalisieren
        const norm = normalizeSignupsPayload(signupsRaw);
        setGrouped(groupForView(norm));
      } catch (e) {
        if (!aborted) setErr(e?.message || "LOAD_FAILED");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => { aborted = true; };
  }, [raidId]);

  // permissions (Owner/Admin/Raidlead==lead)
  const canManage = useMemo(() => {
    if (!raid || !me) return false;
    const rl = me?.roleLevel ?? 0;
    const isOwner = !!me?.isOwner || rl >= 3;
    const isAdmin = !!me?.isAdmin || rl >= 2;
    const isLead =
      (me?.isRaidlead || rl >= 1) &&
      String(me.discordId || me.id || "") === String((raid && raid.lead) || "");
    return isOwner || isAdmin || isLead;
  }, [raid, me]);

  // Mutations
  async function pick(id) {
    if (!id || !canManage) return;
    setBusyIds((s) => new Set(s).add(id));
    try {
      await apiPickSignup(id);
      // nur Signups neu laden
      const list = normalizeSignupsPayload(await apiListRaidSignups(raidId));
      setGrouped(groupForView(list));
    } catch (e) {
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
    if (!id || !canManage) return;
    setBusyIds((s) => new Set(s).add(id));
    try {
      await apiUnpickSignup(id);
      const list = normalizeSignupsPayload(await apiListRaidSignups(raidId));
      setGrouped(groupForView(list));
    } catch (e) {
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
    raid,          // { title, dateLabel, diffLabel, lootLabel, bosses, leadLabel }
    grouped,       // { saved:{tanks,heals,dps,loot}, open:{...} }
    canManage,
    loading,
    error,
    pick,
    unpick,
    busyIds,
  };
}

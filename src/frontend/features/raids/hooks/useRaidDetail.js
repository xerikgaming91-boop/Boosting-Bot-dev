// src/frontend/features/raids/hooks/useRaidDetail.js
import { useEffect, useMemo, useState } from "react";

/* ------------------------- Utils ------------------------- */
const U = (s) => String(s || "").toUpperCase();

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function labelDiff(d) {
  const m = { NORMAL: "Normal", HEROIC: "Heroic", MYTHIC: "Mythic", HC: "Heroic", NM: "Normal", M: "Mythic" };
  return m[U(d)] || d || "-";
}
function labelLoot(v) {
  const u = U(v);
  if (u === "VIP") return "VIP";
  if (u === "SAVED") return "Saved";
  if (u === "UNSAVED") return "Unsaved";
  return v || "-";
}
function preferLeadName(raid) {
  return raid?.leadName || raid?.leadDisplay || raid?.lead || "-";
}
function roleKey(t) {
  const u = U(t);
  if (u.includes("TANK")) return "tanks";
  if (u.includes("HEAL")) return "heals";
  if (u.includes("LOOT")) return "loot";
  return "dps";
}

/* --------------------- Robust JSON Fetch --------------------- */
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", ...(opts.headers || {}) },
    ...opts,
  });

  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");

  if (!isJSON) {
    // HTML/Plaintext erwischt (z. B. Login-Seite oder falscher Proxy)
    const text = await res.text().catch(() => "");
    const preview = (text || "").slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `HTTP_${res.status}: Erwartete JSON-Antwort, bekam "${ct || "unknown"}" von ${url}. ` +
      `Vermutlich Login/Redirect oder die Anfrage landete am Frontend. Preview: ${preview}`
    );
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`HTTP_${res.status}: Ungültiges JSON von ${url}`);
  }

  if (!res.ok || (data && data.ok === false)) {
    throw new Error(data?.error || `HTTP_${res.status}`);
  }

  return data;
}

/* ---------------------- API-Wrappers ---------------------- */
async function apiGetRaid(raidId, signal) {
  const j = await fetchJSON(`/api/raids/${raidId}`, { signal });
  return j.raid;
}
async function apiMe(signal) {
  const j = await fetchJSON(`/api/users/me?_=${Date.now()}`, { signal });
  return j.user || j;
}
async function apiListRaidSignups(raidId, signal) {
  const j = await fetchJSON(`/api/raids/${raidId}/signups`, { signal });
  return j.signups || [];
}
async function apiPickSignup(id) {
  await fetchJSON(`/api/signups/${id}/pick`, { method: "POST" });
}
async function apiUnpickSignup(id) {
  await fetchJSON(`/api/signups/${id}/unpick`, { method: "POST" });
}

/* ---------------------- Haupt-Hook ---------------------- */
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

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [raidData, meData, signupList] = await Promise.all([
          apiGetRaid(raidId, ac.signal),
          apiMe(ac.signal).catch(() => null), // falls /me 401 liefert
          apiListRaidSignups(raidId, ac.signal),
        ]);
        setRaid(raidData || null);
        setMe(meData);
        setSignups(Array.isArray(signupList) ? signupList : []);
      } catch (e) {
        if (!ac.signal.aborted) {
          console.error("useRaidDetail load failed:", e);
          setErr(e?.message || "LOAD_FAILED");
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [raidId]);

  const canManage = useMemo(() => {
    if (!raid || !me) return false;
    const isLead = String(raid.lead || "") === String(me.discordId || me.id || "");
    const roles = Array.isArray(me.roles) ? me.roles.map((r) => String(r).toLowerCase()) : [];
    const has = (x) => roles.some((r) => r.includes(x));
    return !!(me.isOwner || me.isAdmin || has("owner") || has("admin") || isLead);
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

  // Warcraftlogs-Link bauen
  function wclUrlFromChar(c) {
    const name = c?.name;
    const realm = c?.realm;
    const region = String(c?.region || "eu").toLowerCase();
    if (!name || !realm) return null;
    return `https://www.warcraftlogs.com/character/${region}/${encodeURIComponent(
      realm
    )}/${encodeURIComponent(name)}`;
  }

  const grouped = useMemo(() => {
    const base = () => ({ tanks: [], heals: [], dps: [], loot: [] });
    const g = { saved: base(), open: base() };

    (signups || []).forEach((s) => {
      const k = roleKey(s.type);
      const picked = s.saved || U(s.status) === "PICKED";

      const charName = s.char?.name
        ? `${s.char.name}${s.char.realm ? "-" + s.char.realm : ""}`
        : null;

      const item = {
        id: s.id,
        who: charName || s.displayName || s.userId || "-", // Charname bevorzugen
        classLabel: s.char?.class || s.class || "",
        roleLabel: U(s.type || "-"),
        note: s.note || "",
        saved: !!picked,
        statusLabel: U(s.status || "-"),
        ilvl: s.char?.itemLevel ?? s.char?.ilvl ?? null,
        wcl: wclUrlFromChar(s.char),
        realm: s.char?.realm || null,
        nameOnly: s.char?.name || null,
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

  return { raid: raidView, grouped, canManage, loading, error, pick, unpick, busyIds };
}

// src/frontend/features/raids/hooks/useRaid.js
import { useCallback, useEffect, useState } from "react";

/* --------------------- fetch + JSON + Preview --------------------- */
function isJsonResponse(res) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}
function preview(text = "", n = 160) {
  return String(text).slice(0, n).replace(/\s+/g, " ");
}
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", ...(opts.headers || {}) },
    cache: "no-store",
    ...opts,
  });

  if (!isJsonResponse(res)) {
    const txt = await res.text().catch(() => "");
    const err = new Error(
      `Erwartete JSON, bekam "${res.headers.get("content-type") || "unknown"}" (${res.status}) von ${url}. Preview: ${preview(
        txt
      )}`
    );
    err.status = res.status;
    err.body = txt;
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || data?.message || `HTTP_${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return { res, data };
}

/* --------------------- Normalisierung + ID-Scan --------------------- */
function normalizeRaid(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const id = raw.id ?? raw.raidId ?? raw._id ?? null;
  const date = raw.date ?? raw.dateTime ?? raw.datetime ?? raw.when ?? null;
  return { ...raw, id: id != null ? Number(id) : id, date };
}

function deepExtractId(any) {
  if (any == null) return null;

  // direkte Felder
  const direct = any?.raid?.id ?? any?.raidId ?? any?.id ?? any?._id ?? null;
  if (direct != null) return Number(direct);

  // rekursiv nach /raids/123 und id/raidId suchen
  const scan = (obj) => {
    if (obj == null) return null;
    if (typeof obj === "string") {
      const m = /\/raids\/(\d+)/i.exec(obj);
      return m ? Number(m[1]) : null;
    }
    if (typeof obj !== "object") return null;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (/^id$/i.test(k) || /raidid/i.test(k) || /_id$/i.test(k)) {
        if (typeof v === "number" || /^\d+$/.test(String(v))) return Number(v);
      }
      const r = scan(v);
      if (r != null) return r;
    }
    return null;
  };
  return scan(any);
}

/* ----------------------------- API ----------------------------- */
async function apiListRaids() {
  const { data } = await fetchJSON("/api/raids");
  const list = Array.isArray(data?.raids) ? data.raids : Array.isArray(data) ? data : [];
  return list.map(normalizeRaid);
}

async function apiCreateRaid(payload) {
  console.groupCollapsed("%c[createRaid] POST /api/raids", "color:#8ab4f8");
  console.debug("payload:", payload);

  const { res, data } = await fetchJSON("/api/raids", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // alles loggen, was der Server liefert
  try {
    console.debug("status:", res.status);
    console.debug("headers:", Object.fromEntries(res.headers.entries()));
    console.debug("json:", data);
  } finally {
    console.groupEnd();
  }

  // direkter Raid?
  const direct = (data && typeof data === "object" && data.raid) ? data.raid : data;
  let raid =
    direct && typeof direct === "object" && (direct.id || direct.raidId || direct.date)
      ? direct
      : null;

  // ID aus Body
  let id = deepExtractId(data);

  // Location-Header (z.B. /api/raids/29 oder /raids/29)
  if (!id) {
    const loc = res.headers.get("location");
    const m = loc && /\/raids\/(\d+)/i.exec(String(loc));
    if (m) id = Number(m[1]);
  }

  // Wenn wir nur eine ID haben → später Detail ggf. nachladen (macht der Caller nicht zwingend)
  return normalizeRaid(raid || (id != null ? { id } : null));
}

/* ----------------------------- Hook ----------------------------- */
function sortRaids(a, b) {
  const da = new Date(a.date || 0).getTime();
  const db = new Date(b.date || 0).getTime();
  if (da !== db) return da - db;
  return Number(a.id || 0) - Number(b.id || 0);
}

export function useRaidBootstrap() {
  const [me, setMe] = useState(null);
  const [leads, setLeads] = useState([]);
  const [raids, setRaids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRaids, setLoadingRaids] = useState(false);
  const [error, setError] = useState(null);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await fetchJSON("/api/users/me");
      setMe(data?.user ?? data ?? null);
    } catch (e) {
      setMe(null);
      if (e?.status && e.status !== 401) setError(e);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      const { data } = await fetchJSON("/api/users/leads");
      const arr = Array.isArray(data) ? data : Array.isArray(data?.leads) ? data.leads : [];
      setLeads(arr);
    } catch {
      setLeads([]);
    }
  }, []);

  const loadRaids = useCallback(async () => {
    setLoadingRaids(true);
    try {
      const list = await apiListRaids();
      setRaids(Array.isArray(list) ? list.slice().sort(sortRaids) : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoadingRaids(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadMe(), loadLeads(), loadRaids()]);
    setLoading(false);
  }, [loadMe, loadLeads, loadRaids]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // -------- CREATE mit harter Diagnose & DIFF-Fallback --------
  const createRaid = useCallback(
    async (payload) => {
      // Ids vor dem Anlegen merken
      const beforeIds = new Set((raids || []).map((r) => Number(r.id)));

      const created = await apiCreateRaid(payload);

      // 1) direkte ID / direktes Raidobjekt
      if (created && created.id != null) {
        const raid = normalizeRaid(created);
        setRaids((prev) => {
          const arr = Array.isArray(prev) ? prev.slice() : [];
          arr.push(raid);
          return arr.sort(sortRaids);
        });
        return { ok: true, raid, id: raid.id };
      }

      console.warn("[createRaid] keine ID in Create-Response – starte Fallback…");

      // 2) Liste laden und Differenz zur vorherigen Liste bestimmen
      const list = await apiListRaids();
      const diff = (list || []).filter((r) => !beforeIds.has(Number(r.id)));

      // a) wenn genau 1 neu ist → das ist der eben erstellte
      if (diff.length === 1) {
        const picked = normalizeRaid(diff[0]);
        setRaids((prev) => {
          const arr = Array.isArray(prev) ? prev.slice() : [];
          if (!arr.some((x) => Number(x.id) === Number(picked.id))) arr.push(picked);
          return arr.sort(sortRaids);
        });
        return { ok: true, raid: picked, id: picked.id };
      }

      // b) sonst nach Titel + Zeitfenster matchen (±10 min)
      const targetTime = new Date(payload?.date || Date.now()).getTime();
      const THRESH = 10 * 60 * 1000;
      const candidates = (list || []).filter((r) => {
        const sameTitle = String(r.title || "") === String(payload?.title || "");
        const dt = Math.abs(new Date(r.date || 0).getTime() - targetTime);
        return sameTitle && dt <= THRESH;
      });
      if (candidates.length) {
        const best = candidates.sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0];
        setRaids((prev) => {
          const arr = Array.isArray(prev) ? prev.slice() : [];
          if (!arr.some((x) => Number(x.id) === Number(best.id))) arr.push(best);
          return arr.sort(sortRaids);
        });
        return { ok: true, raid: best, id: best.id };
      }

      // c) gar keine neue ID gefunden → harter Fehler mit Debug-Hinweisen
      console.error("[createRaid] Fallbacks erschöpft. Siehe Network-Tab und die [createRaid]-Logs.");
      throw new Error("Raid-ID fehlt.");
    },
    [raids]
  );

  const updateRaid = useCallback(async (id, patch) => {
    const { data } = await fetchJSON(`/api/raids/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch || {}),
    });
    const updated = normalizeRaid((data && data.raid) || data || {});
    const ensured = { ...updated, id: updated.id ?? Number(id) };

    setRaids((prev) => {
      const arr = Array.isArray(prev) ? prev.slice() : [];
      const idx = arr.findIndex((r) => Number(r.id) === Number(id));
      if (idx >= 0) arr[idx] = { ...arr[idx], ...ensured };
      return arr.sort(sortRaids);
    });

    return { ok: true, raid: ensured, id: ensured.id };
  }, []);

  const deleteRaid = useCallback(async (id) => {
    await fetchJSON(`/api/raids/${id}`, { method: "DELETE" });
    setRaids((prev) => (Array.isArray(prev) ? prev.filter((r) => Number(r.id) !== Number(id)) : []));
    return { ok: true };
  }, []);

  return {
    me,
    leads,
    raids,
    loading,
    loadingRaids,
    error,

    createRaid,
    updateRaid,
    deleteRaid,

    // Seiten-Guards regelst du bereits pro View
    canCreateRaid: true,
    canPickLead: true,
    canViewRaids: true,
  };
}

// optionaler Default-Export (falls woanders als default importiert)
export default useRaidBootstrap;

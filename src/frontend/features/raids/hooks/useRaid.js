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

  const direct = any?.raid?.id ?? any?.raidId ?? any?.id ?? any?._id ?? null;
  if (direct != null) return Number(direct);

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
  const { res, data } = await fetchJSON("/api/raids", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // --- DEBUG sichtbar machen (nicht debug/verbose, sondern log) ---
  try {
    const headersObj = Object.fromEntries(res.headers.entries());
    window.__BB_LAST_CREATE__ = { payload, status: res.status, headers: headersObj, json: data };
    console.log("[createRaid] status:", res.status);
    console.log("[createRaid] headers:", headersObj);
    console.log("[createRaid] json:", data);
    console.log("[createRaid] payload:", payload);
  } catch {
    /* ignore */
  }

  const direct = (data && typeof data === "object" && data.raid) ? data.raid : data;
  let raid =
    direct && typeof direct === "object" && (direct.id || direct.raidId || direct.date)
      ? direct
      : null;

  let id = deepExtractId(data);
  if (!id) {
    const loc = res.headers.get("location");
    const m = loc && /\/raids\/(\d+)/i.exec(String(loc));
    if (m) id = Number(m[1]);
  }

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

  const createRaid = useCallback(
    async (payload) => {
      const beforeIds = new Set((raids || []).map((r) => Number(r.id)));
      const created = await apiCreateRaid(payload);

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

      const list = await apiListRaids();
      const diff = (list || []).filter((r) => !beforeIds.has(Number(r.id)));

      if (diff.length === 1) {
        const picked = normalizeRaid(diff[0]);
        setRaids((prev) => {
          const arr = Array.isArray(prev) ? prev.slice() : [];
          if (!arr.some((x) => Number(x.id) === Number(picked.id))) arr.push(picked);
          return arr.sort(sortRaids);
        });
        return { ok: true, raid: picked, id: picked.id };
      }

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

      console.error("[createRaid] Fallbacks erschöpft. Siehe window.__BB_LAST_CREATE__ und Network-Tab.");
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

    canCreateRaid: true,
    canPickLead: true,
    canViewRaids: true,
  };
}

export default useRaidBootstrap;

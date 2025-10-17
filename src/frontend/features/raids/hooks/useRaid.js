import { useCallback, useEffect, useState } from "react";

/* ---------------- utils ---------------- */
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

const normDiff = (d) => {
  const v = String(d || "").toLowerCase();
  if (v.startsWith("myth")) return "Mythic";
  if (v.startsWith("hc") || v.startsWith("hero")) return "HC";
  return "Normal";
};
const normLoot = (t) => {
  const v = String(t || "").toLowerCase();
  if (v === "vip") return "vip";
  if (v === "saved") return "saved";
  if (v === "unsaved") return "unsaved";
  return v;
};
const sameLead = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();

function normalizeRaid(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const id = raw.id ?? raw.raidId ?? raw._id ?? null;
  const date = raw.date ?? raw.dateTime ?? raw.datetime ?? raw.when ?? null;
  return {
    ...raw,
    id: id != null ? Number(id) : id,
    date,
    difficulty: normDiff(raw.difficulty),
    lootType: normLoot(raw.lootType),
  };
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

/* ---------------- API ---------------- */
async function apiListRaids() {
  const { data } = await fetchJSON("/api/raids?_=" + Date.now());
  const list = Array.isArray(data?.raids) ? data.raids : Array.isArray(data) ? data : [];
  return list.map(normalizeRaid);
}

async function apiCreateRaid(payload) {
  const { res, data } = await fetchJSON("/api/raids", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  try {
    window.__BB_CREATE_TRACE__ = {
      step: "post",
      payload,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      json: data,
    };
    console.log("[createRaid] status:", res.status);
    console.log("[createRaid] json:", data);
  } catch {}

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

/* -------------- Heuristik-Matching (Fallback) -------------- */
function scoreCandidate(payload, candidate) {
  const when = new Date(payload.date).getTime();
  const ctime = new Date(candidate.date || 0).getTime();
  const dt = Math.abs(ctime - when); // ms
  const within = dt <= 45 * 60 * 1000; // 45 Minuten Fenster
  if (!within) return -1;

  let score = 0;
  // näher in der Zeit = höher
  score += Math.max(0, 10000000 - dt); // große Basis, damit Zeit priorisiert

  if (sameLead(candidate.lead, payload.lead)) score += 5000;
  if (normDiff(candidate.difficulty) === normDiff(payload.difficulty)) score += 3000;
  if (normLoot(candidate.lootType) === normLoot(payload.lootType)) score += 2000;
  if (Number(candidate.bosses || 0) === Number(payload.bosses || 0)) score += 1000;

  // Bonus wenn Titel dieselbe Klasse Wörter enthält (z.B. Heroic/HC, VIP)
  const ct = String(candidate.title || "").toLowerCase();
  const pt = String(payload.title || "").toLowerCase();
  const words = ["vip", "saved", "unsaved", "heroic", "hc", "mythic", "normal"];
  for (const w of words) {
    if (ct.includes(w) && pt.includes(w)) score += 200;
  }
  return score;
}

function sortRaids(a, b) {
  const da = new Date(a.date || 0).getTime();
  const db = new Date(b.date || 0).getTime();
  if (da !== db) return da - db;
  return Number(a.id || 0) - Number(b.id || 0);
}

/* ---------------- Hook ---------------- */
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

      // ID vorhanden → easy
      if (created && created.id != null) {
        const raid = normalizeRaid(created);
        setRaids((prev) => {
          const arr = Array.isArray(prev) ? prev.slice() : [];
          arr.push(raid);
          return arr.sort(sortRaids);
        });
        return { ok: true, raid, id: raid.id };
      }

      console.warn("[createRaid] Keine ID in Create-Response – starte Heuristik…");

      // Liste laden & besten Kandidaten ermitteln
      const list = await apiListRaids();
      const candidates = list
        .filter((r) => !beforeIds.has(Number(r.id))) // neu seit vor dem POST
        .map((r) => ({ r, s: scoreCandidate(payload, r) }))
        .filter((x) => x.s >= 0)
        .sort((a, b) => b.s - a.s);

      try {
        window.__BB_CREATE_TRACE__ = {
          ...(window.__BB_CREATE_TRACE__ || {}),
          step: "fallback",
          payload,
          beforeCount: beforeIds.size,
          listCount: list.length,
          top5: candidates.slice(0, 5),
        };
        console.log("[createRaid] fallback candidates (top5):", candidates.slice(0, 5));
      } catch {}

      const best = candidates[0]?.r;
      if (best?.id != null) {
        const picked = normalizeRaid(best);
        setRaids((prev) => {
          const arr = Array.isArray(prev) ? prev.slice() : [];
          if (!arr.some((x) => Number(x.id) === Number(picked.id))) arr.push(picked);
          return arr.sort(sortRaids);
        });
        return { ok: true, raid: picked, id: picked.id };
      }

      console.error("[createRaid] Fallbacks erschöpft. Siehe window.__BB_CREATE_TRACE__ / Network.");
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

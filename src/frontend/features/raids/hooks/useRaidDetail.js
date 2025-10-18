import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ---- JSON-Helper (GET) ------------------------------------------------- */
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const preview = await res.text().catch(() => "");
    throw new Error(`HTTP_${res.status}: expected JSON, got ${ct}. ${preview.slice(0, 160)}`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP_${res.status}`);
  return data;
}

/** ---- Try-first-JSON (für Mutationen mit alternativen Endpoints) -------- */
async function tryJsonEndpoints(endpoints) {
  let lastErr;
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        credentials: "include",
        method: ep.method || "POST",
        headers: {
          Accept: "application/json",
          ...(ep.body ? { "Content-Type": "application/json" } : {}),
          ...(ep.headers || {}),
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        // falscher Server (meist Vite index.html) → nächste Route probieren
        lastErr = new Error(`HTTP_${res.status}: got ${ct}`);
        continue;
      }

      const json = await res.json();
      if (!res.ok) {
        lastErr = new Error(json?.message || json?.error || `HTTP_${res.status}`);
        continue;
      }
      return json; // Erfolg
    } catch (e) {
      lastErr = e;
      // nächste Route probieren
    }
  }
  throw lastErr || new Error("No endpoint matched");
}

/** ---- IDs & Merge defensiv ---------------------------------------------- */
function idOf(x) {
  return (
    x?.id ??
    x?.signupId ??
    x?.signup_id ??
    x?.characterSignupId ??
    x?._id ??
    null
  );
}
function mergeSignup(prev, next) {
  if (String(idOf(prev)) !== String(idOf(next))) return prev;
  return { ...prev, ...next };
}

/** ======================================================================== */
export default function useRaidDetail(raidId) {
  const [raid, setRaid] = useState(null);
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (!raidId) return;
    abortRef.current?.abort?.();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const [raidRes, signupsRes] = await Promise.all([
        fetchJSON(`/api/raids/${raidId}`, { signal: ac.signal }),
        fetchJSON(`/api/raids/${raidId}/signups`, { signal: ac.signal }),
      ]);
      setRaid(raidRes?.raid ?? raidRes);
      const list = Array.isArray(signupsRes?.signups) ? signupsRes.signups : (signupsRes ?? []);
      setSignups(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e.name !== "AbortError") setError(e);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [raidId]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort?.();
  }, [load]);

  const picked = useMemo(() => signups.filter((s) => !!s?.picked), [signups]);
  const waiting = useMemo(() => signups.filter((s) => !s?.picked), [signups]);

  const applyLocalUpdate = useCallback((updated) => {
    const sid = idOf(updated);
    if (!sid) return;
    setSignups((prev) =>
      prev.map((s) => (String(idOf(s)) === String(sid) ? mergeSignup(s, updated) : s))
    );
  }, []);

  const toggleLocalPickedById = useCallback((signupId, nextPicked) => {
    setSignups((prev) =>
      prev.map((s) => (String(idOf(s)) === String(signupId) ? { ...s, picked: !!nextPicked } : s))
    );
  }, []);

  /** ---- Pick / Unpick mit Endpoint-Fallbacks ---------------------------- */
  const pick = useCallback(
    async (signupId) => {
      if (!raidId || !signupId) return;
      setMutating(true);
      setError(null);

      // Optimistisches Update (sofort im Roster)
      toggleLocalPickedById(signupId, true);

      try {
        // Probiere gängige Serverrouten (nur die, die in deinem Projekt vorkommen).
        const resp = await tryJsonEndpoints([
          // häufige Variante: POST mit Body
          { url: `/api/raids/${raidId}/pick`, method: "POST", body: { signupId } },
          // alternative REST-Formen:
          { url: `/api/raids/${raidId}/signups/${signupId}/pick`, method: "POST" },
          { url: `/api/raids/${raidId}/signups/${signupId}`, method: "PUT", body: { picked: true } },
          { url: `/api/signups/${signupId}/pick`, method: "POST" },
        ]);

        const updated =
          resp?.signup ??
          resp?.data ??
          (Array.isArray(resp?.signups) ? resp.signups.find((s) => String(idOf(s)) === String(signupId)) : null) ??
          null;

        if (updated && typeof updated.picked === "boolean") {
          applyLocalUpdate(updated);
        }
      } catch (e) {
        // Rollback bei Fehler
        toggleLocalPickedById(signupId, false);
        setError(e);
      } finally {
        // Revalidate hält alles konsistent
        await load();
        setMutating(false);
      }
    },
    [raidId, load, applyLocalUpdate, toggleLocalPickedById]
  );

  const unpick = useCallback(
    async (signupId) => {
      if (!raidId || !signupId) return;
      setMutating(true);
      setError(null);

      // Optimistisch rausnehmen
      toggleLocalPickedById(signupId, false);

      try {
        const resp = await tryJsonEndpoints([
          { url: `/api/raids/${raidId}/unpick`, method: "POST", body: { signupId } },
          { url: `/api/raids/${raidId}/signups/${signupId}/unpick`, method: "POST" },
          { url: `/api/raids/${raidId}/signups/${signupId}`, method: "PUT", body: { picked: false } },
          { url: `/api/signups/${signupId}/unpick`, method: "POST" },
        ]);

        const updated =
          resp?.signup ??
          resp?.data ??
          (Array.isArray(resp?.signups) ? resp.signups.find((s) => String(idOf(s)) === String(signupId)) : null) ??
          null;

        if (updated && typeof updated.picked === "boolean") {
          applyLocalUpdate(updated);
        }
      } catch (e) {
        // Rollback
        toggleLocalPickedById(signupId, true);
        setError(e);
      } finally {
        await load();
        setMutating(false);
      }
    },
    [raidId, load, applyLocalUpdate, toggleLocalPickedById]
  );

  return {
    raid,
    signups,
    picked,
    waiting,
    loading,
    mutating,
    error,
    refresh: load,
    pick,
    unpick,
    setSignups,
  };
}

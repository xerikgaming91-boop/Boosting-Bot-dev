// src/frontend/features/raids/hooks/useRaidBootstrap.js
import { useCallback, useEffect, useMemo, useState } from "react";

// Frontend-HTTP (unter app/api, umbenannt auf *API.js)
import {
  apiListRaids,
  apiCreateRaid,
  apiUpdateRaid,
  apiDeleteRaid,
} from "@app/api/raidsAPI";
import { apiGetMe, apiGetLeads } from "@app/api/usersAPI";

/** stabile Sortierung: erst Datum, dann ID */
function sortRaids(a, b) {
  const da = new Date(a.date).getTime();
  const db = new Date(b.date).getTime();
  if (da !== db) return da - db;
  return Number(a.id) - Number(b.id);
}

/**
 * useRaidBootstrap
 * - lädt initial User, Leads und Raids
 * - kapselt Create/Update/Delete
 * - stellt Role-Helper bereit
 *
 * Erwartete API-Formate:
 *   apiGetMe()            -> { user }
 *   apiGetLeads()         -> { leads: [] }
 *   apiListRaids()        -> Raid[]               (Array direkt!)
 *   apiCreateRaid(data)   -> Raid                 (Objekt)
 *   apiUpdateRaid(id, d)  -> Raid                 (Objekt)
 *   apiDeleteRaid(id)     -> true | { ok:true }
 */
export function useRaidBootstrap() {
  const [me, setMe] = useState(null);
  const [leads, setLeads] = useState([]);
  const [raids, setRaids] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingRaids, setLoadingRaids] = useState(false);
  const [error, setError] = useState(null);

  // ---- Role helpers ------------------------------------------------------
  const roleLevel = me?.roleLevel ?? 0;
  const isOwner = !!me?.isOwner || roleLevel >= 3;
  const isAdmin = !!me?.isAdmin || roleLevel >= 2;
  const isRaidlead = !!me?.isRaidlead || roleLevel >= 1;

  const isLeadOrHigher = useMemo(() => roleLevel >= 1, [roleLevel]);
  const isAdminLevel = useMemo(() => roleLevel >= 2, [roleLevel]);

  // ---- Loader ------------------------------------------------------------
  const loadMe = useCallback(async () => {
    try {
      const res = await apiGetMe(); // -> { user }
      setMe(res.user ?? null);
    } catch (e) {
      setMe(null);
      if (e?.status && e.status !== 401) setError(e);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      const res = await apiGetLeads(); // -> { leads: [] }
      setLeads(res.leads || []);
    } catch (e) {
      // nicht fatal
      if (e?.status && e.status !== 401) console.warn("[useRaidBootstrap] leads error:", e);
    }
  }, []);

  const loadRaids = useCallback(async () => {
    setLoadingRaids(true);
    try {
      // WICHTIG: apiListRaids() liefert direkt ein Array!
      const list = await apiListRaids();
      setRaids(Array.isArray(list) ? list.slice().sort(sortRaids) : []);
      // Debug-Helfer (kannst du rausnehmen):
      // console.debug("[useRaidBootstrap] loaded raids:", list.length, list);
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

  // ---- Mutations ---------------------------------------------------------
  const createRaid = useCallback(async (payload) => {
    const raid = await apiCreateRaid(payload); // -> Raid-Objekt
    setRaids((prev) => [raid, ...prev].sort(sortRaids));
    return raid;
  }, []);

  const updateRaid = useCallback(async (id, patch) => {
    const raid = await apiUpdateRaid(id, patch); // -> Raid-Objekt
    setRaids((prev) =>
      prev.map((r) => (String(r.id) === String(id) ? raid : r)).sort(sortRaids)
    );
    return raid;
  }, []);

  const deleteRaid = useCallback(async (id) => {
    await apiDeleteRaid(id); // -> true | { ok:true }
    setRaids((prev) => prev.filter((r) => String(r.id) !== String(id)));
    return true;
  }, []);

  return {
    // data
    me,
    leads,
    raids,

    // loading & errors
    loading,
    loadingRaids,
    error,

    // role helpers
    roleLevel,
    isOwner,
    isAdmin,
    isRaidlead,
    isLeadOrHigher,
    isAdminLevel,

    // actions
    refreshAll,
    createRaid,
    updateRaid,
    deleteRaid,
  };
}

export default useRaidBootstrap;

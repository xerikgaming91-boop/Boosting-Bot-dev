// src/frontend/features/raids/hooks/useRaidBootstrap.js
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiListRaids,
  apiCreateRaid,
  apiUpdateRaid,
  apiDeleteRaid,
} from "@app/api/raidsService";
import { apiGetMe, apiGetLeads } from "@app/api/usersService";

/**
 * useRaidBootstrap
 * Lädt initial:
 *  - aktuellen User (für Rechte)
 *  - mögliche Leads (Dropdown)
 *  - Raids (Liste)
 * Bietet Create/Update/Delete und Helper für Rollenchecks.
 */
export function useRaidBootstrap() {
  const [me, setMe] = useState(null);
  const [leads, setLeads] = useState([]);
  const [raids, setRaids] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingRaids, setLoadingRaids] = useState(false);
  const [error, setError] = useState(null);

  // ---- Role helpers (frontend-only convenience) -------------------------
  const roleLevel = me?.roleLevel ?? 0;
  const isOwner = !!me?.isOwner || roleLevel >= 3;
  const isAdmin = !!me?.isAdmin || roleLevel >= 2;
  const isRaidlead = !!me?.isRaidlead || roleLevel >= 1;

  const isLeadOrHigher = useMemo(() => roleLevel >= 1, [roleLevel]);
  const isAdminLevel = useMemo(() => roleLevel >= 2, [roleLevel]);

  // ---- load parts --------------------------------------------------------
  const loadMe = useCallback(async () => {
    try {
      const res = await apiGetMe();
      setMe(res.user);
    } catch (e) {
      // Wenn 401 → Benutzer nicht eingeloggt
      setMe(null);
      if (e?.status && e.status !== 401) setError(e);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      const res = await apiGetLeads();
      setLeads(res.leads || []);
    } catch (e) {
      // Leads sind "nice to have" – Fehler nicht fatal
      if (e?.status && e.status !== 401) console.warn("[useRaidBootstrap] leads error:", e);
    }
  }, []);

  const loadRaids = useCallback(async () => {
    setLoadingRaids(true);
    try {
      const res = await apiListRaids();
      setRaids(res.raids || []);
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

  // ---- mutations ---------------------------------------------------------
  const createRaid = useCallback(
    async (payload) => {
      const res = await apiCreateRaid(payload);
      // Vorne einsortieren
      setRaids((prev) => [res.raid, ...prev]);
      return res.raid;
    },
    []
  );

  const updateRaid = useCallback(
    async (id, patch) => {
      const res = await apiUpdateRaid(id, patch);
      setRaids((prev) => prev.map((r) => (String(r.id) === String(id) ? res.raid : r)));
      return res.raid;
    },
    []
  );

  const deleteRaid = useCallback(
    async (id) => {
      await apiDeleteRaid(id);
      setRaids((prev) => prev.filter((r) => String(r.id) !== String(id)));
      return true;
    },
    []
  );

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

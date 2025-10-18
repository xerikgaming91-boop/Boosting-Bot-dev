import { useCallback, useEffect, useMemo, useState } from "react";

// === API layer (deine bestehenden API-Funktionen) ===
import {
  apiListRaids,
  apiCreateRaid,
  apiDeleteRaid,
} from "@app/api/raidsAPI";
import { apiGetMe, apiGetLeads } from "@app/api/usersAPI";

const byDateDesc = (a, b) => {
  // sortiere neueste zuerst (fallbacks, falls Felder fehlen)
  const ax = new Date(a?.date || a?.createdAt || 0).getTime();
  const bx = new Date(b?.date || b?.createdAt || 0).getTime();
  return bx - ax;
};

export function useRaidBootstrap() {
  const [me, setMe] = useState(null);
  const [leads, setLeads] = useState([]);
  const [raids, setRaids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRaids, setLoadingRaids] = useState(false);
  const [error, setError] = useState(null);

  const canCreateRaid = !!me?.roles?.includes("LEAD") || !!me?.roles?.includes("ADMIN") || !!me?.roles?.includes("OWNER");
  const canPickLead  = !!me?.roles?.includes("ADMIN") || !!me?.roles?.includes("OWNER");

  const loadMeAndLeads = useCallback(async () => {
    try {
      const [meRes, leadsRes] = await Promise.all([apiGetMe(), apiGetLeads()]);
      setMe(meRes?.user ?? meRes ?? null);
      setLeads(Array.isArray(leadsRes?.users) ? leadsRes.users : (leadsRes ?? []));
    } catch (e) {
      // nicht hart failen – UI soll weiter funktionieren
      setError((e && e.message) || "Fehler beim Laden von Benutzer/Raidleads.");
    }
  }, []);

  const loadRaids = useCallback(async () => {
    setLoadingRaids(true);
    try {
      const list = await apiListRaids();
      const items = Array.isArray(list?.raids) ? list.raids : (Array.isArray(list) ? list : []);
      setRaids(items.sort(byDateDesc));
    } catch (e) {
      setError((e && e.message) || "Fehler beim Laden der Raids.");
    } finally {
      setLoadingRaids(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadMeAndLeads(), loadRaids()]);
      setLoading(false);
    })();
  }, [loadMeAndLeads, loadRaids]);

  const createRaid = useCallback(
    async (payload) => {
      // Keine ID-Voraussetzung! -> robust parsen, Liste aktualisieren.
      try {
        const res = await apiCreateRaid(payload);

        // Mögliche Antwortformen abfangen
        const raid =
          (res && res.raid) ||
          (res && res.data && res.data.raid) ||
          (res && res.id && res) ||
          null;

        if (raid && raid.id != null) {
          // Optimistisch einsetzen
          setRaids((prev) => {
            const next = [raid, ...(prev || [])];
            return next.sort(byDateDesc);
          });
          return { ok: true, raid };
        }

        // Fallback: Liste frisch laden – so ist der neue Raid trotzdem sichtbar
        await loadRaids();
        return { ok: true, raid: null };
      } catch (e) {
        // Häufiger Fall: 200 + HTML (Login/Redirect) -> wirft JSON-Fehler in API-Layer
        const msg =
          (e && e.message) ||
          "Raid konnte nicht erstellt werden. Bitte erneut einloggen?";
        throw new Error(msg);
      }
    },
    [loadRaids]
  );

  const removeRaid = useCallback(
    async (raidId) => {
      await apiDeleteRaid(raidId);
      setRaids((prev) => (prev || []).filter((r) => r.id !== raidId));
    },
    []
  );

  const state = useMemo(
    () => ({
      me,
      leads,
      raids,
      loading,
      loadingRaids,
      error,
      canCreateRaid,
      canPickLead,
    }),
    [me, leads, raids, loading, loadingRaids, error, canCreateRaid, canPickLead]
  );

  const actions = useMemo(
    () => ({
      loadRaids,
      createRaid,
      removeRaid,
      setError,
    }),
    [loadRaids, createRaid, removeRaid]
  );

  return { ...state, ...actions };
}

export default useRaidBootstrap;

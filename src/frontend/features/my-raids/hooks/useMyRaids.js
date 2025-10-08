// src/frontend/features/my-raids/hooks/useMyRaids.js
import { useCallback, useEffect, useState } from "react";
import { apiGetMyRaids } from "@app/api/myRaidsAPI";

export default function useMyRaids({ scope = "upcoming", cycle = "all", onlyPicked = true } = {}) {
  const [upcoming, setUpcoming] = useState({ rostered: [], signups: [] });
  const [past, setPast] = useState({ rostered: [], signups: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiGetMyRaids({ scope, cycle, onlyPicked });
      setUpcoming(data.upcoming || { rostered: [], signups: [] });
      setPast(data.past || { rostered: [], signups: [] });
    } catch (e) {
      console.error("[useMyRaids] load error:", e);
      setErr(e);
      setUpcoming({ rostered: [], signups: [] });
      setPast({ rostered: [], signups: [] });
    } finally {
      setLoading(false);
    }
  }, [scope, cycle, onlyPicked]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { upcoming, past, loading, error: err, refresh };
}

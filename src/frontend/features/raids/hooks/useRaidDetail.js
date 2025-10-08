// src/frontend/features/raids/hooks/useRaidDetail.js
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiGetRaidById, apiListSignupsForRaid, apiPickSignup, apiUnpickSignup } from "../../../app/api/raidDetailAPI";
import { apiGetMe } from "../../../app/api/usersAPI";

export default function useRaidDetail(raidId) {
  const [me, setMe] = useState(null);
  const [raid, setRaid] = useState(null);
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState(new Set());

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [meResp, raidResp, suResp] = await Promise.all([
        apiGetMe().catch(() => ({ ok: false })),
        apiGetRaidById(raidId),
        apiListSignupsForRaid(raidId),
      ]);
      if (meResp?.ok) setMe(meResp.user || meResp.me || null);
      setRaid(raidResp.raid);
      setSignups(suResp.signups || []);
    } finally {
      setLoading(false);
    }
  }, [raidId]);

  useEffect(() => { reload(); }, [reload]);

  const canManage = useMemo(() => {
    if (!me || !raid) return false;
    return !!(me.isOwner || me.isAdmin || (me.isRaidlead && String(raid.lead || "") === String(me.discordId || "")));
  }, [me, raid]);

  const pick = useCallback(async (signupId) => {
    setBusyIds(s => new Set(s).add(signupId));
    try {
      await apiPickSignup(raidId, signupId);
      await reload();
    } finally {
      setBusyIds(s => { const n = new Set(s); n.delete(signupId); return n; });
    }
  }, [raidId, reload]);

  const unpick = useCallback(async (signupId) => {
    setBusyIds(s => new Set(s).add(signupId));
    try {
      await apiUnpickSignup(raidId, signupId);
      await reload();
    } finally {
      setBusyIds(s => { const n = new Set(s); n.delete(signupId); return n; });
    }
  }, [raidId, reload]);

  const grouped = useMemo(() => {
    const toKey = (t) => {
      const v = (t || "").toUpperCase();
      if (v === "TANK") return "tanks";
      if (v === "HEAL" || v === "HEALER") return "heals";
      if (v === "LOOTBUDDY") return "loot";
      return "dps";
    };
    const saved = { tanks: [], heals: [], dps: [], loot: [] };
    const open  = { tanks: [], heals: [], dps: [], loot: [] };
    for (const s of signups) {
      (s.saved ? saved : open)[toKey(s.type)].push(s);
    }
    return { saved, open };
  }, [signups]);

  return { me, raid, signups, grouped, canManage, loading, pick, unpick, reload, busyIds };
}

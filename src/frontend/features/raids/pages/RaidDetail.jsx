// src/frontend/features/raids/pages/RaidDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import useRaidDetail from "../hooks/useRaidDetail";
import RaidDetailView from "../components/RaidDetailView";

function isAdminOwner(user) {
  if (!user) return false;
  const flag = user.isOwner || user.owner || user.isAdmin || user.admin;
  const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
  const has = (x) => roles.some((r) => String(r).toLowerCase().includes(x));
  return Boolean(flag || has("owner") || has("admin"));
}
function isRaidLeadOfRaid(raid, user) {
  if (!raid || !user) return false;
  const meId = String(user.discordId ?? user.id ?? "");
  if (!meId) return false;
  const keys = ["lead", "leadId", "raidLeadId", "leadUserId", "leadDiscordId"];
  return keys.some((k) => raid[k] != null && String(raid[k]) === meId);
}

/**
 * GUARD-WRAPPER:
 * Lädt /api/users/me robust und zeigt Login-Hinweis.
 * Keine weiteren Hooks/Views hier – nur Gate.
 */
export default function RaidDetail() {
  const [me, setMe] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me", {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || !ct.includes("application/json")) {
          if (!ignore) setMe(null);
          return;
        }
        const data = await res.json().catch(() => null);
        const user = data?.user ?? data ?? null;
        const valid =
          user && (user.id != null || user.discordId != null || user.username != null);
        if (!ignore) setMe(valid ? user : null);
      } catch {
        if (!ignore) setMe(null);
      } finally {
        if (!ignore) setAuthLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-6 text-zinc-300">
          Lade …
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Raid</h1>
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-6 text-zinc-300">
          Bitte einloggen, um Raid-Details zu sehen.
        </div>
      </div>
    );
  }

  // ✅ Berechtigt: eigentliche Seite mounten
  return <RaidDetailContent me={me} />;
}

/**
 * ALLE weiteren Hooks hier drin. Diese Komponente wird nur gerendert,
 * wenn der Guard oben durch ist – dadurch bleibt die Hook-Order stabil.
 */
function RaidDetailContent({ me }) {
  const { id } = useParams();

  // Hook immer aufrufen – keine bedingten Hook-Aufrufe!
  const {
    raid,           // View-Model
    raidEntity,     // Raw-Raid
    setRaid,
    grouped,
    loading,
    error,
    pick,
    unpick,
    busyIds,
  } = useRaidDetail(Number(id));

  // Discord-Raidleads (für Edit) laden
  const [leads, setLeads] = useState([]);
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/users/leads", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (ignore) return;
        const arr =
          Array.isArray(data) ? data :
          Array.isArray(data?.leads) ? data.leads :
          Array.isArray(data?.users) ? data.users : [];
        setLeads(arr);
      } catch {
        if (!ignore) setLeads([]);
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Berechtigungen
  const canManage = useMemo(
    () => isAdminOwner(me) || isRaidLeadOfRaid(raidEntity, me),
    [me, raidEntity]
  );
  const canPickLead = isAdminOwner(me);

  // Render
  if (loading && !raid) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        Lade …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-rose-400">
        Fehler: {String(error)}
      </div>
    );
  }

  return (
    <RaidDetailView
      raid={raid}
      grouped={grouped}
      canManage={canManage}
      pick={pick}
      unpick={unpick}
      busyIds={busyIds}
      raidEntity={raidEntity}
      setRaid={setRaid}
      me={me}
      leads={leads}
      canPickLead={canPickLead}
    />
  );
}

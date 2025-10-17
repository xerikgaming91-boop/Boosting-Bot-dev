// src/frontend/features/raids/pages/RaidDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import useRaidDetail from "../hooks/useRaidDetail";
import RaidDetailView from "../components/RaidDetailView";
import RaidEditForm from "../components/RaidEditForm";

export default function RaidDetail() {
  const { id } = useParams();
  const {
    raid,           // View-Model (Labels)
    raidEntity,     // Raw-Raid (id, date/dateTime, difficulty, lootType, bosses, lead*)
    setRaid,        // Setter für lokales Raid
    me,             // aktueller User
    grouped,
    canManage,
    loading,
    error,
    pick,
    unpick,
    busyIds,
  } = useRaidDetail(Number(id));

  // --- Edit-Toggle nur hier (nicht im View) ---
  const [editOpen, setEditOpen] = useState(false);
  const onToggleEdit = () => setEditOpen((v) => !v);

  // --- Discord-Raidleads laden (wie Create-Form) ---
  const [leads, setLeads] = useState([]);
  useEffect(() => {
    let ignore = false;
    async function loadLeads() {
      try {
        // Primär: /api/users/leads (wie in Create-Form)
        const res = await fetch("/api/users/leads", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (ignore) return;

        const arr =
          Array.isArray(data) ? data :
          Array.isArray(data?.leads) ? data.leads :
          Array.isArray(data?.users) ? data.users :
          [];

        setLeads(arr);
      } catch {
        if (!ignore) setLeads([]);
      }
    }
    loadLeads();
    return () => { ignore = true; };
  }, []);

  // --- Admin/Owner-Check (robust) ---
  const canPickLead = useMemo(() => {
    const u = me || {};
    const roles = Array.isArray(u.roles) ? u.roles.map(String) : [];
    return Boolean(
      u.isOwner ||
      u.isAdmin ||
      u.owner ||
      u.admin ||
      ["OWNER", "Owner", "ADMIN", "Admin"].includes(String(u.role)) ||
      roles.some(r => ["owner", "Owner", "OWNER", "admin", "Admin", "ADMIN"].includes(r))
    );
  }, [me]);

  // --- Edit-Node (UI) ---
  const editNode = editOpen && raidEntity ? (
    <RaidEditForm
      raid={raidEntity}
      setRaid={setRaid}
      me={me}
      leads={leads}
      canPickLead={canPickLead}
      onClose={() => setEditOpen(false)}
    />
  ) : null;

  if (loading && !raid) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">Lade …</div>;
  }
  if (error) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-rose-400">Fehler: {String(error)}</div>;
  }

  return (
    <RaidDetailView
      raid={raid}
      grouped={grouped}
      canManage={canManage}
      pick={pick}
      unpick={unpick}
      busyIds={busyIds}

      // Edit-Props (View bleibt dumb)
      canShowEdit={Boolean(raidEntity?.id)}
      editOpen={editOpen}
      onToggleEdit={onToggleEdit}
      editNode={editNode}
    />
  );
}

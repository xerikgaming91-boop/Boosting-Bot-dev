// src/frontend/features/users/pages/UsersList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiListUsers, apiUpdateUserRoles } from "../../../app/api/usersAPI.js";

function isAdminOwner(user) {
  if (!user) return false;
  const flag = user.isOwner || user.owner || user.isAdmin || user.admin;
  const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
  const has = (n) => roles.some((r) => String(r).toLowerCase().includes(n));
  return Boolean(flag || has("owner") || has("admin"));
}

/**
 * GUARD-WRAPPER: lädt /api/users/me robust und gated auf Admin/Owner.
 * Keine weiteren Hooks hier – nur Guards und dann Content mounten.
 */
export default function UsersList() {
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
        const valid = user && (user.id != null || user.discordId != null || user.username != null);
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
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-6 text-zinc-300">Lade …</div>
      </div>
    );
  }
  if (!me) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Users</h1>
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-6 text-zinc-300">
          Bitte einloggen, um diese Seite zu nutzen.
        </div>
      </div>
    );
  }
  if (!isAdminOwner(me)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Users</h1>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
          Kein Zugriff. Diese Seite ist nur für Admin/Owner.
        </div>
      </div>
    );
  }

  // ✅ Berechtigt → Inhalte mounten (alle weiteren Hooks dort)
  return <UsersListContent me={me} />;
}

/**
 * EIGENTLICHE SEITE – alle weiteren Hooks hier drin.
 * Diese Komponente wird nur gerendert, wenn der Guard passt.
 */
function UsersListContent({ me }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // Debounce für Suche
  const [needle, setNeedle] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setNeedle(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Laden
  const load = async () => {
    if (!me) return;
    setBusy(true);
    setErr("");
    try {
      const list = await apiListUsers(needle);
      const normalized = (list || []).map((u) => ({
        ...u,
        $isOwner: !!u.isOwner,
        $isAdmin: !!u.isAdmin,
        $isRaidlead: !!u.isRaidlead,
        $dirty: false,
        $saving: false,
      }));
      setRows(normalized);
    } catch (e) {
      setErr(e?.message || "Fehler beim Laden");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needle, me]);

  const onToggle = (idx, key) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[idx] };
      row[key] = !row[key];
      row.$dirty = true;
      // Owner impliziert Admin + Raidlead
      if (key === "$isOwner" && row[key]) {
        row.$isAdmin = true;
        row.$isRaidlead = true;
      }
      copy[idx] = row;
      return copy;
    });
  };

  const saveRow = async (idx) => {
    setRows((prev) => { const c = [...prev]; c[idx].$saving = true; return c; });
    setErr("");
    try {
      const r = rows[idx];
      await apiUpdateUserRoles(r.discordId, {
        isOwner: r.$isOwner,
        isAdmin: r.$isAdmin,
        isRaidlead: r.$isRaidlead,
      });
      await load();
    } catch (e) {
      setErr(e?.message || "Speichern fehlgeschlagen");
      setRows((prev) => { const c = [...prev]; c[idx].$saving = false; return c; });
    }
  };

  const anyDirty = useMemo(() => rows.some((r) => r.$dirty && !r.$saving), [rows]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche (Name, Username, Discord-ID)…"
            className="w-64 rounded-md bg-zinc-800/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 ring-1 ring-inset ring-zinc-700 focus:outline-none"
          />
          <button onClick={load} disabled={busy} className="btn btn-secondary">
            Aktualisieren
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-700/70">
        <table className="w-full min-w-[720px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-zinc-800/70 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300/90">
              <th className="px-3 py-2 rounded-tl-lg">User</th>
              <th className="px-3 py-2">Discord-ID</th>
              <th className="px-3 py-2">Rollen</th>
              <th className="px-3 py-2">Aktion</th>
              <th className="px-3 py-2 rounded-tr-lg text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u, idx) => (
              <tr key={u.discordId} className="border-t border-zinc-700/60 even:bg-zinc-900/30">
                <td className="px-3 py-2 align-middle">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
                      alt=""
                      className="h-8 w-8 rounded-full ring-1 ring-zinc-700/70"
                    />
                    <div className="leading-tight">
                      <div className="text-sm text-white">{u.displayName || u.username || "—"}</div>
                      <div className="text-xs text-zinc-400">{u.username || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 align-middle text-sm text-zinc-300">{u.discordId}</td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-indigo-600"
                        checked={u.$isRaidlead}
                        onChange={() => onToggle(idx, "$isRaidlead")}
                      />
                      Raidlead
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-indigo-600"
                        checked={u.$isAdmin}
                        onChange={() => onToggle(idx, "$isAdmin")}
                      />
                      Admin
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-indigo-600"
                        checked={u.$isOwner}
                        onChange={() => onToggle(idx, "$isOwner")}
                      />
                      Owner
                    </label>
                  </div>
                </td>
                <td className="px-3 py-2 align-middle">
                  <button
                    onClick={() => saveRow(idx)}
                    disabled={!u.$dirty || u.$saving}
                    className="btn btn-primary"
                  >
                    Speichern
                  </button>
                </td>
                <td className="px-3 py-2 align-middle text-right">
                  {u.$saving ? (
                    <span className="text-xs text-zinc-400">Speichern…</span>
                  ) : u.$dirty ? (
                    <span className="text-xs text-amber-300">Änderungen nicht gespeichert</span>
                  ) : (
                    <span className="text-xs text-emerald-300">OK</span>
                  )}
                </td>
              </tr>
            ))}
            {!busy && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-zinc-400">
                  Keine Nutzer gefunden.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-800/70">
              <td className="px-3 py-2 rounded-bl-lg text-xs text-zinc-400">
                {busy ? "Lade…" : `${rows.length} Nutzer`}
              </td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
              <td className="px-3 py-2">
                {anyDirty ? (
                  <span className="text-xs text-amber-300">Es gibt ungespeicherte Änderungen</span>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                )}
              </td>
              <td className="px-3 py-2 rounded-br-lg" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// src/frontend/features/users/pages/Users.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";
// Falls du deine API-Clients unter app/api liegen hast, passt dieser Import:
import {
  apiListUsers,
  apiUpdateUserRoles,
} from "../../../app/api/usersAPI.js"; // <— ggf. anpassen, falls dein Pfad anders ist

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded bg-zinc-700/60 px-2 py-0.5 text-[11px] font-medium text-zinc-200 ring-1 ring-inset ring-zinc-700/60">
      {children}
    </span>
  );
}

export default function Users() {
  const { isLead } = useAuth();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // Debounce Search
  const [needle, setNeedle] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setNeedle(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = async () => {
    setBusy(true);
    setErr("");
    try {
      const list = await apiListUsers(needle);
      // kleine Normalisierung
      const normalized = (list || []).map((u) => ({
        ...u,
        // Working copy für toggles
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
    if (isLead) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needle, isLead]);

  const onToggle = (idx, key) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[idx] };
      row[key] = !row[key];
      row.$dirty = true;
      // Konsistenz: Owner impliziert Admin & Raidlead zur Anzeige (freiwillig)
      if (key === "$isOwner" && row[key]) {
        row.$isAdmin = true;
        row.$isRaidlead = true;
      }
      copy[idx] = row;
      return copy;
    });
  };

  const saveRow = async (idx) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx].$saving = true;
      return copy;
    });
    setErr("");
    try {
      const r = rows[idx];
      await apiUpdateUserRoles(r.discordId, {
        isOwner: r.$isOwner,
        isAdmin: r.$isAdmin,
        isRaidlead: r.$isRaidlead,
        // rolesCsv optional: wir lassen Backend Meta berechnen
      });
      // nach Save als Quelle der Wahrheit neu ziehen
      await load();
    } catch (e) {
      setErr(e?.message || "Speichern fehlgeschlagen");
      setRows((prev) => {
        const copy = [...prev];
        copy[idx].$saving = false;
        return copy;
      });
    }
  };

  const anyDirty = useMemo(() => rows.some((r) => r.$dirty && !r.$saving), [rows]);

  if (!isLead) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-white mb-2">Users</h1>
        <p className="text-sm text-zinc-300">
          Nur für <code>raidlead</code>, <code>admin</code> oder <code>owner</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche (Name, Username, Discord-ID)…"
            className="w-64 rounded-md bg-zinc-800/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 ring-1 ring-inset ring-zinc-700 focus:outline-none focus:ring-indigo-500"
          />
          <button
            onClick={load}
            disabled={busy}
            className="rounded bg-zinc-700/70 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
          >
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

                    {/* Anzeige highestRole */}
                    <div className="ml-2">
                      <Badge>{u.highestRole || "user"}</Badge>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 align-middle">
                  <button
                    onClick={() => saveRow(idx)}
                    disabled={!u.$dirty || u.$saving}
                    className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
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

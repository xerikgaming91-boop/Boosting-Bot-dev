// src/frontend/features/users/pages/UsersList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";
import { apiListUsers } from "../../../app/api/usersAPI.js";

function Badge({ children, tone = "zinc" }) {
  const tones = {
    zinc: "bg-zinc-700/60 text-zinc-200 ring-zinc-700/60",
    green: "bg-emerald-600/20 text-emerald-300 ring-emerald-600/40",
    amber: "bg-amber-600/20 text-amber-300 ring-amber-600/40",
    blue: "bg-sky-600/20 text-sky-300 ring-sky-600/40",
    violet: "bg-violet-600/20 text-violet-300 ring-violet-600/40",
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tones[tone] || tones.zinc}`}>
      {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-3 rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</div>
      {children}
    </div>
  );
}

export default function UsersList() {
  const { user } = useAuth();
  const canManage = !!(user?.isOwner || user?.isAdmin);

  const [q, setQ] = useState("");
  const [needle, setNeedle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // Debounce Suche
  useEffect(() => {
    const t = setTimeout(() => setNeedle(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = async () => {
    if (!canManage) return;
    setBusy(true);
    setErr("");
    try {
      const list = await apiListUsers(needle);
      setRows(
        (list || []).map((u) => ({
          ...u,
          $open: false,
          $charsCount: (u.chars || []).length,
          $histCount: (u.history || []).length,
        }))
      );
    } catch (e) {
      setErr(e?.message || "Fehler beim Laden");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needle, canManage]);

  const visible = useMemo(() => rows, [rows]);

  if (!canManage) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-xl font-semibold text-white">Benutzerverwaltung</h1>
        <p className="text-sm text-zinc-300">
          Nur für <code>owner</code> oder <code>admin</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Benutzerverwaltung</h1>
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
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>
      )}

      <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-700/70">
        <table className="w-full min-w-[920px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-zinc-800/70 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300/90">
              <th className="px-3 py-2 rounded-tl-lg">User</th>
              <th className="px-3 py-2">Discord-ID</th>
              <th className="px-3 py-2">Rollen</th>
              <th className="px-3 py-2">Counts</th>
              <th className="px-3 py-2 rounded-tr-lg text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u, idx) => (
              <React.Fragment key={u.discordId}>
                <tr className="border-t border-zinc-700/60 even:bg-zinc-900/30">
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
                    <div className="flex flex-wrap items-center gap-2">
                      {u.isOwner && <Badge tone="violet">Owner</Badge>}
                      {u.isAdmin && <Badge tone="amber">Admin</Badge>}
                      {u.isRaidlead && <Badge tone="blue">Raidlead</Badge>}
                      {!u.isOwner && !u.isAdmin && !u.isRaidlead && <Badge>User</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center gap-3 text-sm text-zinc-200">
                      <span>Chars: <Badge tone="green">{u.$charsCount}</Badge></span>
                      <span>Historie: <Badge tone="green">{u.$histCount}</Badge></span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle text-right">
                    <button
                      onClick={() =>
                        setRows((prev) => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], $open: !copy[idx].$open };
                          return copy;
                        })
                      }
                      className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
                    >
                      {u.$open ? "Schließen" : "Details"}
                    </button>
                  </td>
                </tr>

                {u.$open && (
                  <tr className="bg-zinc-900/40">
                    <td colSpan={5} className="px-3 pb-3 pt-1">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Section title="Chars">
                          {u.chars?.length ? (
                            <ul className="space-y-1">
                              {u.chars.map((c) => (
                                <li key={c.id} className="flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm text-white">
                                      {c.name}-{c.realm}{" "}
                                      <span className="text-xs text-zinc-400">
                                        ({c.class || "?"} / {c.spec || "?"})
                                      </span>
                                    </div>
                                    <div className="text-xs text-zinc-400">
                                      iLvl {c.itemLevel ?? "—"} · RIO {Math.round(c.rioScore ?? 0)}
                                    </div>
                                  </div>
                                  {c.wclUrl ? (
                                    <a
                                      href={c.wclUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-sky-300 hover:underline"
                                    >
                                      WarcraftLogs
                                    </a>
                                  ) : (
                                    <span className="text-xs text-zinc-500">—</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-zinc-400">Keine Chars.</div>
                          )}
                        </Section>

                        <Section title="Raid-Historie (letzte 20)">
                          {u.history?.length ? (
                            <ul className="space-y-1">
                              {u.history.map((h) => (
                                <li key={`${h.id}-${h.raidId}`} className="flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm text-white">
                                      {h.raidTitle || `Raid #${h.raidId}`}
                                    </div>
                                    <div className="text-xs text-zinc-400">
                                      {h.date ? new Date(h.date).toLocaleString() : "—"} · {h.type} · {h.char?.name ? `${h.char.name}-${h.char.realm}` : "—"}
                                    </div>
                                  </div>
                                  <Badge tone={h.status === "PICKED" ? "green" : "zinc"}>{h.status}</Badge>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-zinc-400">Keine Einträge.</div>
                          )}
                        </Section>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}

            {!busy && visible.length === 0 && (
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
                {busy ? "Lade…" : `${visible.length} Nutzer`}
              </td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
              <td className="px-3 py-2 rounded-br-lg" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

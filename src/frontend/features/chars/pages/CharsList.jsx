// src/frontend/features/chars/pages/CharsList.jsx
import React, { useEffect, useState } from "react";
import useMyChars from "../hooks/useMyChars";
import CharImportForm from "../components/CharImportForm";

function isAdminOwner(user) {
  if (!user) return false;
  const flag = user.isOwner || user.owner || user.isAdmin || user.admin;
  const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
  const has = (n) => roles.some((r) => String(r).toLowerCase().includes(n));
  return Boolean(flag || has("owner") || has("admin"));
}
function isBooster(user) {
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
  return roles.some((r) => String(r).toLowerCase().includes("boost"));
}

/**
 * GUARD-WRAPPER: Diese Komponente macht NUR Auth & Gate.
 * Die eigentliche Seite (mit Hooks) lebt in <CharsListContent />.
 */
export default function CharsList() {
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
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Meine Chars</h1>
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-6 text-zinc-300">
          Bitte einloggen, um diese Seite zu nutzen.
        </div>
      </div>
    );
  }

  if (!(isBooster(me) || isAdminOwner(me))) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Meine Chars</h1>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
          Kein Zugriff. Diese Seite ist nur für Booster (oder Admin/Owner).
        </div>
      </div>
    );
  }

  // ✅ Ab hier sind Berechtigungen ok -> eigentliche Seite mounten
  return <CharsListContent />;
}

/**
 * EIGENTLICHE SEITE: Alle weiteren Hooks hier drin.
 * Diese Komponente wird nur gerendert, wenn der Guard passt.
 */
function CharsListContent() {
  const { chars, loading, error, preview, importChar, removeChar } = useMyChars();
  const errText = error?.message || error;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Meine Chars</h1>

      <div className="mb-6">
        <CharImportForm onPreview={preview} onImport={importChar} loading={loading} />
      </div>

      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70">
        <div className="border-b border-zinc-800/60 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Gespeicherte Chars</h2>
        </div>

        <div className="px-3 py-3">
          {loading ? (
            <div className="px-3 py-10 text-center text-zinc-400">Lädt …</div>
          ) : errText ? (
            <div className="px-3 py-6 text-sm text-red-400">Fehler: {String(errText)}</div>
          ) : !Array.isArray(chars) || chars.length === 0 ? (
            <div className="px-3 py-10 text-center text-zinc-400">Noch keine Chars angelegt.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Realm</th>
                    <th className="px-4 py-2 text-left">Klasse</th>
                    <th className="px-4 py-2 text-left">Spec</th>
                    <th className="px-4 py-2 text-left">ILvl</th>
                    <th className="px-4 py-2 text-left">RIO</th>
                    <th className="px-4 py-2 text-left">Progress</th>
                    <th className="px-4 py-2 text-left">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-200">
                  {chars.map((c) => (
                    <tr key={`${c.userId}:${c.name}:${c.realm}`}>
                      <td className="px-4 py-2 font-medium">{c.name}</td>
                      <td className="px-4 py-2">{c.realm}</td>
                      <td className="px-4 py-2">{c.class || "–"}</td>
                      <td className="px-4 py-2">{c.spec || "–"}</td>
                      <td className="px-4 py-2">{c.itemLevel ?? "–"}</td>
                      <td className="px-4 py-2">{c.rioScore ?? "–"}</td>
                      <td className="px-4 py-2">{c.progress || "–"}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => removeChar(c.id)}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

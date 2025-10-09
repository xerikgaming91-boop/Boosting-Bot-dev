import React, { useEffect, useRef, useState } from "react";
import usePresets from "../hooks/usePresets";
import PresetsForm from "../components/PresetsForm.jsx";

function isAdminOwner(user) {
  if (!user) return false;
  const flag = user.isOwner || user.owner || user.isAdmin || user.admin;
  const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
  const has = (n) => roles.some((r) => String(r).toLowerCase().includes(n));
  return Boolean(flag || has("owner") || has("admin"));
}

export default function PresetsList() {
  // 1) Auth robust laden (Status + Content-Type prüfen)
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

  // 2) ALLE weiteren Hooks VOR jedem Return (für stabile Hook-Order)
  const { items, loading, error, createPreset, updatePreset, deletePreset } = usePresets();
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState(null);
  const formRef = useRef(null);

  const safeItems = Array.isArray(items) ? items : [];
  const currentEdit = safeItems.find((x) => x.id === editId);

  async function handleCreate(payload) {
    setFormError(null);
    try { await createPreset(payload); }
    catch (e) { setFormError(e?.message || "Erstellen fehlgeschlagen"); }
  }
  async function handleUpdate(payload) {
    if (!editId) return;
    setFormError(null);
    try { await updatePreset(editId, payload); setEditId(null); }
    catch (e) { setFormError(e?.message || "Speichern fehlgeschlagen"); }
  }
  function cancelEdit() { setEditId(null); setFormError(null); }
  function submitFromRow() { formRef.current?.submit?.(); }

  // 3) Render-Guards NACH den Hooks
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
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Presets</h1>
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-6 text-zinc-300">Bitte einloggen, um diese Seite zu nutzen.</div>
      </div>
    );
  }
  if (!isAdminOwner(me)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Presets</h1>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">Kein Zugriff. Diese Seite ist nur für Admin/Owner.</div>
      </div>
    );
  }

  // 4) Seite
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">Presets</h1>

      <div className="mb-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/70">
        <div className="border-b border-zinc-800/60 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            {editId ? "Preset bearbeiten" : "Neues Preset anlegen"}
          </h2>
        </div>
        <div className="px-5 py-4">
          {formError && (
            <div className="mb-3 rounded-md border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
              {String(formError)}
            </div>
          )}
          <PresetsForm
            ref={formRef}
            key={editId ? `edit-${editId}` : "create"}
            mode={editId ? "edit" : "create"}
            initial={currentEdit}
            onSubmit={editId ? handleUpdate : handleCreate}
            onCancel={cancelEdit}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70">
        <div className="border-b border-zinc-800/60 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Übersicht</h2>
        </div>

        <div className="px-3 py-3">
          {loading ? (
            <div className="px-3 py-10 text-center text-zinc-400">Lädt …</div>
          ) : error ? (
            <div className="px-3 py-6 text-sm text-red-400">Fehler: {String(error.message || error)}</div>
          ) : safeItems.length === 0 ? (
            <div className="px-3 py-10 text-center text-zinc-400">Noch keine Presets vorhanden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Tanks</th>
                    <th className="px-4 py-2 text-left">Healer</th>
                    <th className="px-4 py-2 text-left">DPS</th>
                    <th className="px-4 py-2 text-left">Lootbuddys</th>
                    <th className="px-4 py-2 text-left">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-200">
                  {safeItems.map((p) => {
                    const isEditing = p.id === editId;
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-2 font-medium">{p.name}</td>
                        <td className="px-4 py-2">{p.tanks}</td>
                        <td className="px-4 py-2">{p.healers}</td>
                        <td className="px-4 py-2">{p.dps}</td>
                        <td className="px-4 py-2">{p.lootbuddies}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            {!isEditing ? (
                              <>
                                <button onClick={() => setEditId(p.id)} className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">Bearbeiten</button>
                                <button onClick={() => deletePreset(p.id)} className="rounded-md border border-red-700 px-2 py-1 text-xs text-red-300 hover:bg-red-900/30">Löschen</button>
                              </>
                            ) : (
                              <>
                                <button onClick={submitFromRow} className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500">Speichern</button>
                                <button onClick={cancelEdit} className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">Abbrechen</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

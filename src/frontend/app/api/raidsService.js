// src/frontend/app/api/raidsService.js
// Frontend-API für Raids (fetch wrappers)

const API_BASE = import.meta?.env?.VITE_API_BASE || "";

/**
 * interner Helper
 * - hängt automatisch /api davor
 * - sendet Credentials (Session-Cookie)
 */
async function http(path, opts = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const msg = body?.error || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return body;
}

/** Liste aller Raids (öffentlich) */
export async function apiListRaids() {
  const data = await http(`/raids`, { method: "GET" });
  return Array.isArray(data?.raids) ? data.raids : [];
}

/** Einzelnen Raid lesen (öffentlich) */
export async function apiGetRaidById(id) {
  if (!id && id !== 0) throw new Error("id_required");
  const data = await http(`/raids/${id}`, { method: "GET" });
  return data?.raid || null;
}

/** Raid anlegen (geschützt) */
export async function apiCreateRaid(payload) {
  const data = await http(`/raids`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
  return data?.raid || null;
}

/** Raid aktualisieren (geschützt) */
export async function apiUpdateRaid(id, patch) {
  if (!id && id !== 0) throw new Error("id_required");
  const data = await http(`/raids/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch ?? {}),
  });
  return data?.raid || null;
}

/** Raid löschen (geschützt) */
export async function apiDeleteRaid(id) {
  if (!id && id !== 0) throw new Error("id_required");
  const data = await http(`/raids/${id}`, { method: "DELETE" });
  return data?.deleted || null;
}

// src/frontend/app/api/usersAPI.js
// Frontend-HTTP Wrapper für User/Leads

const API_BASE = import.meta?.env?.VITE_API_BASE || "";

/** interner Fetch-Helper mit Credentials und Cache-Bust */
async function http(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();

  // Cache-Bust nur für GET
  let url = `${API_BASE}/api${path}`;
  if (method === "GET") {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}_=${Date.now()}`;
  }

  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(opts.headers || {}),
    },
    ...opts,
  });

  // 304 kann in Dev über Proxy passieren – wie „ok ohne Body“ behandeln
  if (res.status === 304) return {};

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const msg = body?.error || `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body;
}

/** Session-User – Backend liefert { ok, user } */
export async function apiGetMe() {
  return http(`/users/me`, { method: "GET" });
}

/** Raidleads – Backend liefert { ok, leads } */
export async function apiGetLeads() {
  return http(`/users/leads`, { method: "GET" });
}

/**
 * Users-Liste
 * Erwartetes Format: { ok, users } oder { ok, list }
 * Fallback: leeres Array
 */
export async function apiListUsers() {
  const data = await http(`/users`, { method: "GET" });
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.list)) return data.list;
  return [];
}

/**
 * Rollen/Level eines Users updaten.
 * Wir versuchen zuerst PATCH /api/users/:id/roles
 * und fallen auf PATCH /api/users/:id zurück, falls dein Backend das so erwartet.
 *
 * @param {string|number} id  Discord-ID oder interne ID (je nach Backend)
 * @param {object} patch      z.B. { isRaidlead: true, isAdmin: false, roleLevel: 1 }
 * @returns {object|true}     aktualisierter User oder true
 */
export async function apiUpdateUserRoles(id, patch) {
  if (id === undefined || id === null) throw new Error("id_required");

  // 1) Bevorzugt: dedizierter Roles-Endpunkt
  try {
    const data = await http(`/users/${id}/roles`, {
      method: "PATCH",
      body: JSON.stringify(patch ?? {}),
    });
    // Mögliche Antworten: { ok, user } oder { ok, updated }
    return data?.user || data?.updated || true;
  } catch (e) {
    if (e?.status !== 404) throw e;
  }

  // 2) Fallback: direktes PATCH auf den User
  const data = await http(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch ?? {}),
  });
  return data?.user || data?.updated || true;
}

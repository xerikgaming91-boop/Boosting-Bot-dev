// src/frontend/app/api/usersService.js
// Einheitliche User-API für das Frontend (mit Cookies!)
// Alle Calls senden credentials, damit die Session am Backend ankommt.

const JSON_HEADERS = { "Accept": "application/json", "Content-Type": "application/json" };

async function toJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `HTTP_${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/** Auth-Session lesen (nur für Komfort im Frontend) */
export async function apiGetSession() {
  const res = await fetch("/api/auth/session", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return toJson(res); // { ok:true, user: {...} | null }
}

/** Aktuellen User (DB) lesen – benötigt Login (401 sonst) */
export async function apiGetMe() {
  const res = await fetch("/api/users/me", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return toJson(res); // { ok:true, user: {...} }
}

/** Leads/Admins/Owner Liste (für Dropdowns) */
export async function apiGetLeads() {
  const res = await fetch("/api/users/leads", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return toJson(res); // { ok:true, leads: [...] }
}

/** Admin-Bereich: Userliste (optional q= Suche) */
export async function apiListUsers(q) {
  const url = new URL("/api/users", window.location.origin);
  if (q) url.searchParams.set("q", q);
  const res = await fetch(url.toString().replace(window.location.origin, ""), {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return toJson(res); // { ok:true, users:[...] }
}

/** Admin-Bereich: Upsert eines Users inkl. Rollen */
export async function apiUpsertUser(payload) {
  const res = await fetch("/api/users/upsert", {
    method: "POST",
    credentials: "include",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload || {}),
  });
  return toJson(res); // { ok:true, user:{...} }
}

/** Admin-Bereich: Nur Rollen eines Users ändern */
export async function apiUpdateRoles(discordId, patch) {
  if (!discordId) throw new Error("discordId_required");
  const res = await fetch(`/api/users/${encodeURIComponent(discordId)}/roles`, {
    method: "PATCH",
    credentials: "include",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch || {}),
  });
  return toJson(res); // { ok:true, user:{...} }
}

/* ---- Alias für Legacy-Imports (z. B. UsersList.jsx) ------------------- */
export const apiUpdateUserRoles = apiUpdateRoles;

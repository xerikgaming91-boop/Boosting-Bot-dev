// src/frontend/app/api/raidsService.js

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

/** Liste aller Raids (optional: query params später ergänzbar) */
export async function apiListRaids() {
  const res = await fetch("/api/raids", {
    credentials: "include",
    headers: { "Accept": "application/json" },
  });
  return toJson(res); // { ok:true, raids:[...] }
}

/** Einzelnen Raid lesen */
export async function apiGetRaid(id) {
  const res = await fetch(`/api/raids/${encodeURIComponent(id)}`, {
    credentials: "include",
    headers: { "Accept": "application/json" },
  });
  return toJson(res); // { ok:true, raid:{...} }
}

/** Raid erstellen */
export async function apiCreateRaid(payload) {
  const res = await fetch("/api/raids", {
    method: "POST",
    credentials: "include",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload || {}),
  });
  return toJson(res); // { ok:true, raid:{...} }
}

/** Raid aktualisieren */
export async function apiUpdateRaid(id, patch) {
  const res = await fetch(`/api/raids/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch || {}),
  });
  return toJson(res); // { ok:true, raid:{...} }
}

/** Raid löschen */
export async function apiDeleteRaid(id) {
  const res = await fetch(`/api/raids/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Accept": "application/json" },
  });
  return toJson(res); // { ok:true }
}

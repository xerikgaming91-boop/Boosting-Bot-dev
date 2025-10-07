// src/frontend/app/api/raidsAPI.js
// Frontend-HTTP Wrapper für Raids-Endpunkte

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

  // 304 kann in Dev über Proxy passieren – wir behandeln es wie "ok ohne Body"
  if (res.status === 304) {
    // als leerer Body werten (wir haben ohnehin Cache-Bust → sollte selten sein)
    return {};
  }

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

/** Liste aller Raids – Backend liefert { ok, raids } */
export async function apiListRaids() {
  const data = await http(`/raids`, { method: "GET" });
  return Array.isArray(data?.raids) ? data.raids : [];
}

/** Einzelner Raid – Backend liefert { ok, raid } */
export async function apiGetRaidById(id) {
  if (!id && id !== 0) throw new Error("id_required");
  const data = await http(`/raids/${id}`, { method: "GET" });
  return data?.raid || null;
}

/** Raid anlegen – Backend liefert { ok, raid } */
export async function apiCreateRaid(payload) {
  const data = await http(`/raids`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
  return data?.raid || null;
}

/** Raid bearbeiten – Backend liefert { ok, raid } */
export async function apiUpdateRaid(id, patch) {
  if (!id && id !== 0) throw new Error("id_required");
  const data = await http(`/raids/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch ?? {}),
  });
  return data?.raid || null;
}

/** Raid löschen – Backend liefert { ok:true } */
export async function apiDeleteRaid(id) {
  if (!id && id !== 0) throw new Error("id_required");
  const data = await http(`/raids/${id}`, { method: "DELETE" });
  return data?.ok ?? true;
}

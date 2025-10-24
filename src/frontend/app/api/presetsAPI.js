// src/frontend/app/api/presetsAPI.js
// HTTP Wrapper für Presets-Endpunkte (List + Details)

const API_BASE = import.meta?.env?.VITE_API_BASE || "";

async function http(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  let url = `${API_BASE}/api${path}`;
  if (method === "GET") {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}_=${Date.now()}`;
  }
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(opts.headers || {}),
    },
    ...opts,
  });

  if (res.status === 304) return {};
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg = isJson ? (body?.error || body?.message || res.statusText) : res.statusText;
    throw new Error(msg || `HTTP_${res.status}`);
  }
  return body;
}

export async function apiListPresets() {
  const data = await http(`/presets`, { method: "GET" });
  // expected: { presets: [...] } oder direkt []
  return Array.isArray(data) ? data : (data?.presets || []);
}

export async function apiGetPresetById(id) {
  if (!id && id !== 0) return null;
  const data = await http(`/presets/${id}`, { method: "GET" });
  return data?.preset || data || null;
}

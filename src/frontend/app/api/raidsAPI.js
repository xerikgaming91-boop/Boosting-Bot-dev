// src/frontend/app/api/raidsAPI.js

function isJson(res) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}
function htmlPreview(text = "", n = 140) {
  return String(text).slice(0, n).replace(/\s+/g, " ");
}
function normalizeRaid(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const id =
    raw.id ??
    raw.raidId ??
    raw._id ??
    (typeof raw === "number" ? raw : null);

  // vereinheitliche Datumsschlüssel
  const date = raw.date ?? raw.dateTime ?? raw.datetime ?? raw.when ?? null;

  return {
    ...raw,
    id: id != null ? Number(id) : id,
    date,
  };
}

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return { res, data: null };

  if (!isJson(res)) {
    // Hilfreicher Fehler statt stilles HTML (SPA-Fallback/Redirect)
    const text = await res.text().catch(() => "");
    const msg = `Erwartete JSON, bekam "${res.headers.get("content-type") ||
      "unknown"}" von ${url}. Preview: ${htmlPreview(text)}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `HTTP_${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return { res, data };
}

// --- Helpers --------------------------------------------------------------

function pickIdFrom(any) {
  const id =
    any?.raid?.id ??
    any?.id ??
    any?.raidId ??
    any?._id ??
    null;
  return id != null ? Number(id) : null;
}

function pickRaidFrom(any) {
  if (!any) return null;
  if (typeof any === "object" && any.raid && typeof any.raid === "object") {
    return any.raid;
  }
  if (typeof any === "object" && (any.id || any.raidId || any.date || any.difficulty)) {
    return any;
  }
  return null;
}

async function readRaidFromLocation(res) {
  const loc = res.headers.get("location");
  const id = loc && /\/raids\/(\d+)/i.exec(String(loc))?.[1];
  if (!id) return null;
  return await apiGetRaid(Number(id));
}

// --- API ------------------------------------------------------------------

export async function apiListRaids() {
  const { data } = await request("GET", "/api/raids");
  // Akzeptiere sowohl { ok, raids } als auch blanke Liste
  const list = Array.isArray(data?.raids) ? data.raids : Array.isArray(data) ? data : [];
  return list.map(normalizeRaid);
}

export async function apiGetRaid(id) {
  const { data } = await request("GET", `/api/raids/${id}`);
  const raid = pickRaidFrom(data) || {};
  if (!pickIdFrom(raid)) {
    // manche Endpunkte schicken { ok:true, id, ... } ohne nested 'raid'
    const withId = { ...raid, id: pickIdFrom(data) };
    if (!withId.id) throw new Error("Raid-ID fehlt.");
    return normalizeRaid(withId);
  }
  return normalizeRaid(raid);
}

export async function apiCreateRaid(payload) {
  const { res, data } = await request("POST", "/api/raids", payload);

  // 1) Versuche, direkt ein Raid-Objekt zu lesen
  const direct = pickRaidFrom(data);
  if (direct) {
    const raid = normalizeRaid(direct);
    if (!raid?.id) {
      const id = pickIdFrom(data);
      if (id) raid.id = id;
    }
    if (!raid?.id) throw new Error("Raid-ID fehlt.");
    return raid;
  }

  // 2) ID aus JSON
  const id = pickIdFrom(data);
  if (id) {
    return await apiGetRaid(id);
  }

  // 3) ggf. Location-Header auswerten
  const fromLoc = await readRaidFromLocation(res);
  if (fromLoc?.id) return normalizeRaid(fromLoc);

  throw new Error("Raid-ID fehlt.");
}

export async function apiUpdateRaid(id, patch) {
  // Akzeptiere PATCH/PUT, je nach Server
  try {
    const { data } = await request("PATCH", `/api/raids/${id}`, patch);
    const raid = pickRaidFrom(data) || {};
    const ensured = normalizeRaid({ ...raid, id: pickIdFrom(data) ?? id });
    return ensured;
  } catch (e) {
    // fallback: nach erfolgreichem 204 o.ä. Details nachladen
    if (e?.status === 405 || e?.status === 404) {
      const { data } = await request("PUT", `/api/raids/${id}`, patch);
      const raid = pickRaidFrom(data) || {};
      const ensured = normalizeRaid({ ...raid, id: pickIdFrom(data) ?? id });
      return ensured;
    }
    throw e;
  }
}

export async function apiDeleteRaid(id) {
  await request("DELETE", `/api/raids/${id}`);
  return { ok: true };
}

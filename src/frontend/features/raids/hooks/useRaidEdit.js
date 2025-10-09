// src/frontend/features/raids/hooks/useRaidEdit.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { useResolvedRaidId } from "./useRaidDetail";

/**
 * useRaidEdit
 * - Kapselt die komplette Bearbeiten-Logik für einen Raid (Formstate, Validierung, Speichern).
 * - Keine UI/Markup – nur Daten + Actions (MVCS).
 *
 * Integration (typisch):
 *   const { raid, setRaid, startEdit, stopEdit, editMode } = useRaidDetail();
 *   const edit = useRaidEdit({ raid, setRaid, onUpdated: stopEdit });
 *
 *   // In deiner Edit-Komponente:
 *   <input {...edit.bind("title")} />
 *   <input type="datetime-local" {...edit.bind("dateTime")} />
 *   <select {...edit.bind("difficulty")}>...</select>
 *   ...
 *   <button onClick={edit.submit} disabled={edit.saving || !edit.dirty}>Speichern</button>
 *   <button onClick={edit.cancel} disabled={edit.saving}>Abbrechen</button>
 */

// ----------------- Hilfsfunktionen (Fetch & JSON robust) -----------------
function buildHtmlError(text, res, url, method = "GET") {
  const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? ` – ${titleMatch[1].trim()}` : "";
  const where = res?.url || url || "";
  const code = res?.status ? ` ${res.status}` : "";
  const hint =
    "Server lieferte HTML statt JSON (häufig Login-Redirect oder Frontend-Index). Prüfe Auth/Proxy.";
  return new Error(`${method} ${where}${code}: Antwort ist HTML${title}. ${hint}`);
}

async function parseResponseExpectJson(res, url, method) {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    try {
      if (ct.includes("application/json")) {
        const data = await res.json();
        const msg = data?.error || data?.message || `${method} ${url} -> ${res.status}`;
        throw new Error(msg);
      }
      const text = await res.text();
      throw buildHtmlError(text, res, url, method);
    } catch (e) {
      if (e.name === "SyntaxError") {
        const text = await res.text();
        throw buildHtmlError(text, res, url, method);
      }
      throw e;
    }
  }
  if (ct.includes("application/json")) return await res.json();
  const text = await res.text();
  throw buildHtmlError(text, res, url, method);
}

async function req(method, url, body) {
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
  if (res.status === 204) return null;
  return await parseResponseExpectJson(res, url, method);
}

// ----------------- Bearbeiten: schreibbare Felder bestimmen -----------------

// Welche Felder sind _typisch_ editierbar? (Wir schneiden riskante/ableitbare Felder ab)
const DEFAULT_EDITABLE_KEYS = [
  "title",
  "dateTime",
  "instance",
  "difficulty",
  "description",
  "notes",
  "maxPlayers",
  "voiceChannelId",
  "textChannelId",
  "lootType",
  "faction",
];

function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function pickEditable(initial) {
  if (!isPlainObject(initial)) return {};
  const keys = Object.keys(initial);
  // Schnittmenge: vorhandene Felder, die wir als editierbar definieren
  const allow = new Set(DEFAULT_EDITABLE_KEYS);
  const out = {};
  for (const k of keys) {
    if (allow.has(k)) out[k] = initial[k];
  }
  // Fallback: wenn fast nichts gematcht hat, erlauben wir safe basics
  if (Object.keys(out).length === 0) {
    if ("title" in initial) out.title = initial.title;
    if ("dateTime" in initial) out.dateTime = initial.dateTime;
    if ("difficulty" in initial) out.difficulty = initial.difficulty;
    if ("description" in initial) out.description = initial.description;
  }
  return out;
}

function normalizeDateTimeForInput(dt) {
  // Erwartet ISO/Date – gibt "YYYY-MM-DDTHH:mm" (local) für <input type="datetime-local" />
  try {
    if (!dt) return "";
    const d = typeof dt === "string" ? new Date(dt) : dt;
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  } catch {
    return "";
  }
}

function normalizeDateTimeForServer(dtInput) {
  // dtInput ist "YYYY-MM-DDTHH:mm" (ohne TZ) → lokale Zeit in ISO
  if (!dtInput) return dtInput;
  const d = new Date(dtInput);
  if (Number.isNaN(d.getTime())) return dtInput;
  return d.toISOString();
}

// ----------------- Der Hook -----------------
export default function useRaidEdit({ raid, setRaid, onUpdated } = {}) {
  const resolvedRaidId = useResolvedRaidId();
  const raidId = raid?.id ?? resolvedRaidId ?? null;

  const initialForm = useMemo(() => pickEditable(raid || {}), [raid]);
  const [form, setForm] = useState(initialForm);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Wenn sich der Raid ändert (neues Laden etc.), Form zurücksetzen
  useEffect(() => {
    setForm(initialForm);
    setDirty(false);
    setError("");
  }, [initialForm]);

  const bind = useCallback(
    (field) => {
      return {
        name: field,
        value:
          field === "dateTime"
            ? normalizeDateTimeForInput(form[field])
            : form[field] ?? "",
        onChange: (e) => {
          const v = e?.target?.type === "checkbox" ? e.target.checked : e?.target?.value ?? e;
          setForm((prev) => {
            const next = { ...prev, [field]: field === "dateTime" ? v : v };
            return next;
          });
          setDirty(true);
        },
      };
    },
    [form]
  );

  const set = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  const reset = useCallback(() => {
    setForm(initialForm);
    setDirty(false);
    setError("");
  }, [initialForm]);

  const submit = useCallback(async () => {
    if (!raidId) {
      setError("Keine Raid-ID zum Aktualisieren gefunden.");
      return;
    }
    setSaving(true);
    setError("");

    // Payload vorbereiten
    const payload = { ...form };
    if ("dateTime" in payload) {
      payload.dateTime = normalizeDateTimeForServer(payload.dateTime);
    }

    // Mehrere Endpoints versuchen (PUT -> PATCH -> POST /update)
    const endpoints = [
      { method: "PUT", url: `/api/raids/${raidId}` },
      { method: "PATCH", url: `/api/raids/${raidId}` },
      { method: "POST", url: `/api/raids/${raidId}/update` },
    ];

    try {
      let updated = null;
      let lastErr = null;
      for (const ep of endpoints) {
        try {
          const res = await req(ep.method, ep.url, payload);
          if (res && typeof res === "object") {
            updated = res;
            break;
          }
          // manche Backends geben nichts zurück -> hole Detail neu
          if (!res) {
            const detail = await req("GET", `/api/raids/${raidId}`);
            updated = detail;
            break;
          }
        } catch (e) {
          lastErr = e;
          // versuche nächsten Endpoint
        }
      }
      if (!updated && lastErr) throw lastErr;

      // Signups (falls vom Server nicht zurückgegeben) erhalten
      const nextRaid = {
        ...(raid || {}),
        ...(updated || {}),
        signups: updated?.signups ?? raid?.signups ?? [],
      };

      // lokalen State aktualisieren
      if (typeof setRaid === "function") setRaid(nextRaid);

      setDirty(false);
      if (typeof onUpdated === "function") onUpdated(nextRaid);
      return nextRaid;
    } catch (e) {
      setError(e.message || String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [raidId, form, raid, setRaid, onUpdated]);

  const cancel = useCallback(() => {
    reset();
    if (typeof onUpdated === "function") {
      // kein Update – nur schließen, falls gewünscht
      onUpdated(raid || null);
    }
  }, [reset, onUpdated, raid]);

  return {
    raidId,
    form,
    set,      // programmatic setter
    bind,     // input-binding
    reset,
    submit,
    cancel,

    dirty,
    saving,
    error,
  };
}

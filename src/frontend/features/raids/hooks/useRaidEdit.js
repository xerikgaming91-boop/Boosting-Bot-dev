// src/frontend/features/raids/hooks/useRaidEdit.js
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * useRaidEdit
 * - Update: date/time, difficulty, lootType, (Lead*), bosses (nur bei Mythic)
 * - Difficulty: Normal/Heroic/Mythic <-> NHC/HC/MYTHIC
 * - Loot: Saved / Unsaved / VIP (Mythic => erzwungen VIP)
 * - FIX: Optimistisches Local-Merge + Refetch-Fallback, damit Änderungen ohne Reload sichtbar sind.
 */

function buildHtmlError(text, res, url, method = "GET") {
  const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? ` – ${titleMatch[1].trim()}` : "";
  const where = res?.url || url || "";
  const code = res?.status ? ` ${res.status}` : "";
  const hint = "Server lieferte HTML statt JSON (Login/Proxy?).";
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

function normalizeDateTimeForInput(dt) {
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
  } catch { return ""; }
}
function normalizeDateTimeForServer(dtInput) {
  if (!dtInput) return dtInput;
  const d = new Date(dtInput);
  if (Number.isNaN(d.getTime())) return dtInput;
  return d.toISOString();
}

// Difficulty Mapping UI <-> API
function toUiDifficulty(apiVal) {
  const v = String(apiVal || "").toUpperCase();
  if (v === "HC") return "Heroic";
  if (v === "NHC" || v === "NORMAL") return "Normal";
  if (v === "MYTHIC") return "Mythic";
  return apiVal || "";
}
function toApiDifficulty(uiVal) {
  const v = String(uiVal || "").toUpperCase();
  if (v === "HEROIC" || v === "HC") return "HC";
  if (v === "NORMAL" || v === "NHC") return "NHC";
  if (v === "MYTHIC") return "MYTHIC";
  return uiVal || "";
}

// LootType: Saved / Unsaved / VIP (Mythic => VIP)
function toUiLootType(apiVal) {
  const v = String(apiVal || "").toUpperCase();
  if (v === "SAVED") return "Saved";
  if (v === "UNSAVED" || v === "UN-SAVED") return "Unsaved";
  if (v === "VIP") return "VIP";
  return "Unsaved";
}
function toApiLootType(uiVal, uiDifficulty) {
  const d = String(uiDifficulty || "").toUpperCase();
  if (d === "MYTHIC") return "VIP";
  const v = String(uiVal || "").toUpperCase();
  if (v === "SAVED") return "SAVED";
  if (v === "UNSAVED") return "UNSAVED";
  if (v === "VIP") return "VIP";
  return "UNSAVED";
}

// Lead-Feld-Heuristik
function detectLeadKey(raid) {
  const keys = ["leadId", "raidLeadId", "leadUserId", "lead", "raidlead", "leadDiscordId"];
  return keys.find((k) => k in (raid || {})) || "lead";
}
function pickInitial(raid, canEditLead) {
  const base = {
    dateTime: raid?.dateTime ?? raid?.date ?? "",
    difficulty: toUiDifficulty(raid?.difficulty ?? ""),
    lootType: toUiLootType(raid?.lootType ?? ""),
    bosses: raid?.bosses ?? "",
  };
  if (canEditLead) {
    const leadKey = detectLeadKey(raid);
    base[leadKey] = raid?.[leadKey] ?? "";
    base.__leadKey = leadKey;
  }
  if (String(base.difficulty).toLowerCase() === "mythic" && base.lootType !== "VIP") {
    base.lootType = "VIP";
  }
  return base;
}

// Prüft, ob eine Server-Antwort tatsächlich Felder enthält, die wir bearbeiten
const EDIT_KEYS = ["date", "dateTime", "difficulty", "lootType", "bosses"];
function responseContainsEditedKeys(obj, leadKey) {
  if (!obj || typeof obj !== "object") return false;
  for (const k of EDIT_KEYS) if (k in obj) return true;
  if (leadKey && (leadKey in obj)) return true;
  return false;
}

export default function useRaidEdit({ raid, setRaid, canEditLead = false, onUpdated } = {}) {
  const initial = useMemo(() => pickInitial(raid || {}, canEditLead), [raid, canEditLead]);
  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setForm(initial); setDirty(false); setError(""); }, [initial]);

  const bind = useCallback(
    (field) => ({
      name: field,
      value: field === "dateTime" ? normalizeDateTimeForInput(form[field]) : (form[field] ?? ""),
      onChange: (e) => {
        const v = e?.target?.type === "checkbox" ? e.target.checked : e?.target?.value ?? e;
        setForm((prev) => {
          const next = { ...prev, [field]: field === "dateTime" ? v : v };
          if (field === "difficulty" && String(v).toLowerCase() === "mythic") {
            next.lootType = "VIP"; // Regel
          }
          return next;
        });
        setDirty(true);
      },
    }),
    [form]
  );

  const set = useCallback((field, value) => { setForm((p) => ({ ...p, [field]: value })); setDirty(true); }, []);
  const reset = useCallback(() => { setForm(initial); setDirty(false); setError(""); }, [initial]);

  const submit = useCallback(async () => {
    if (!raid?.id) { setError("Raid-ID fehlt."); return; }
    setSaving(true); setError("");

    const leadKey = form.__leadKey;
    const iso = "dateTime" in form ? normalizeDateTimeForServer(form.dateTime) : undefined;

    // Request-Payload (API-Form)
    const payload = {};
    if (iso) { payload.date = iso; payload.dateTime = iso; }
    if ("difficulty" in form) payload.difficulty = toApiDifficulty(form.difficulty);
    payload.lootType = toApiLootType(form.lootType, form.difficulty);
    if (String(form.difficulty || "").toLowerCase() === "mythic" && "bosses" in form) {
      payload.bosses = form.bosses === "" ? null : Number(form.bosses);
      if (Number.isNaN(payload.bosses)) delete payload.bosses;
    }
    if (canEditLead && leadKey) { payload[leadKey] = form[leadKey] ?? ""; }

    // >>> Optimistisches Local-Merge (damit UI sofort aktualisiert)
    const optimistic = (prev) => {
      const next = { ...(prev || {}) };
      if (iso) { next.date = iso; next.dateTime = iso; }
      if ("difficulty" in payload) next.difficulty = payload.difficulty;
      if ("lootType" in payload) next.lootType = payload.lootType;
      if ("bosses" in payload) next.bosses = payload.bosses;
      if (canEditLead && leadKey && leadKey in payload) next[leadKey] = payload[leadKey];
      return next;
    };
    if (typeof setRaid === "function") {
      setRaid(optimistic(raid));
    }

    const id = raid.id;
    const endpoints = [
      { method: "PATCH", url: `/api/raids/${id}` },
      { method: "PUT",   url: `/api/raids/${id}` },
      { method: "POST",  url: `/api/raids/${id}/update` },
    ];

    try {
      let updated = null, lastErr = null;

      for (const ep of endpoints) {
        try {
          const res = await req(ep.method, ep.url, payload);
          // Wenn Server ein vollständiges Objekt zurückgibt → verwenden
          if (res && typeof res === "object" && responseContainsEditedKeys(res, leadKey)) {
            updated = res;
            break;
          }
          // Manche APIs geben { ok:true } zurück → in dem Fall Detail nachladen
          if (!res || (res && !responseContainsEditedKeys(res, leadKey))) {
            const detail = await req("GET", `/api/raids/${id}`);
            updated = detail;
            break;
          }
        } catch (e) {
          lastErr = e;
        }
      }
      if (!updated && lastErr) throw lastErr;

      // Finalen lokalen State setzen
      const nextRaid = (() => {
        // Wenn der Refetch ein vollständiges Objekt liefert, nimm es,
        // sonst bleibe beim optimistisch gemergten Stand.
        const base = responseContainsEditedKeys(updated, leadKey) ? updated : optimistic(raid);
        return {
          ...(raid || {}),
          ...(base || {}),
          signups: (updated && updated.signups) ? updated.signups : (raid?.signups ?? []),
        };
      })();

      if (typeof setRaid === "function") setRaid(nextRaid);
      setDirty(false);
      if (typeof onUpdated === "function") onUpdated(nextRaid);
      return nextRaid;
    } catch (e) {
      setError(e.message || String(e));
      // Bei Fehler könnten wir theoretisch einen Re-Load triggern – hier konservativ: nur Fehler anzeigen.
      throw e;
    } finally {
      setSaving(false);
    }
  }, [raid, form, canEditLead, setRaid, onUpdated]);

  const cancel = useCallback(() => {
    reset();
    if (typeof onUpdated === "function") onUpdated(raid || null);
  }, [reset, onUpdated, raid]);

  return { form, bind, set, reset, submit, cancel, dirty, saving, error };
}

// src/frontend/features/raids/hooks/useRaidCreateForm.js
import { useEffect, useMemo, useState } from "react";

<<<<<<< Updated upstream
/** Extrahiert die neue Raid-ID aus der Serverantwort (mehrere Varianten unterstützt). */
function extractRaidId(res, data) {
  // 1) Häufige JSON-Varianten
  const id =
    data?.raid?.id ??
    data?.id ??
    data?.raidId ??
    data?.raid?.raidId ??
    null;

  if (id != null) return Number(id);

  // 2) Location-Header: z.B. /api/raids/29 oder /raids/29
  const loc = res?.headers?.get?.("location");
  if (loc) {
    const m = String(loc).match(/\/raids\/(\d+)/i);
    if (m) return Number(m[1]);
  }

  // 3) message/url-Felder durchsuchen (Fallback)
  const s = JSON.stringify(data || {});
  const m2 = s.match(/\/raids\/(\d+)/i);
  if (m2) return Number(m2[1]);

  return null;
}

/** Sorgt dafür, dass wir wirklich JSON kriegen – wirf‘ klaren Fehler, wenn nicht. */
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });

  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");

  // Erlaube „201 Created“ mit leerem Body → id wird ggf. aus Location gelesen.
  if (!isJSON) {
    // Versuch: trotzdem Text lesen (für Debug) – werfe klaren Fehler
    const text = await res.text().catch(() => "");
    const preview = (text || "").slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `Erwartete JSON-Antwort, bekam "${ct || "unknown"}" von ${url}. ` +
      `Antwort-Preview: ${preview}`
    );
  }

  const data = await res.json().catch(() => ({}));
  return { res, data };
=======
function labelDifficulty(d) {
  if (d === "HC") return "HC";
  if (d === "Mythic") return "Mythic";
  return "Normal";
}
function labelLoot(t) {
  if (t === "vip") return "VIP";
  if (t === "saved") return "Saved";
  if (t === "unsaved") return "Unsaved";
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
>>>>>>> Stashed changes
}

/**
 * useRaidCreateForm
 * - Kümmert sich nur um das Erstellen (kein Update!)
 * - Lässt vorhandene Werte-Logik unverändert (values -> 1:1 zum Server)
 * - Gibt bei Erfolg die neue ID zurück, damit dein Page-Component navigieren kann
 */
export default function useRaidCreateForm(initialValues = {}) {
  const [values, setValues] = useState(() => ({
    // Belasse deine Felder; das sind nur sichere Defaults:
    date: null,                  // ISO-String (z.B. "2025-10-17T20:00:00Z")
    difficulty: "HEROIC",        // "NORMAL" | "HEROIC" | "MYTHIC"
    lootType: "SAVED",           // "SAVED" | "UNSAVED" | "VIP" (bei MYTHIC nur VIP)
    lead: null,                  // Discord-ID des Leads (wie bisher von dir genutzt)
    ...initialValues,
  }));

<<<<<<< Updated upstream
  const [leads, setLeads] = useState([]);
  const [saving, setSaving] = useState(false);
=======
  const [difficulty, setDifficulty] = useState("HC");
  const [lootType, setLootType] = useState("vip");
  const [date, setDate] = useState("");
  const [bosses, setBosses] = useState(8);
  const [lead, setLead] = useState("");
  const [submitting, setSubmitting] = useState(false);
>>>>>>> Stashed changes
  const [error, setError] = useState("");

  // Dropdown für Raidlead wie auf /raids: aus Discord-Server
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data } = await fetchJSON("/api/users/leads", { method: "GET" });
        const arr = Array.isArray(data) ? data
          : Array.isArray(data?.leads) ? data.leads
          : Array.isArray(data?.users) ? data.users
          : [];
        if (!ignore) setLeads(arr);
      } catch (e) {
        if (!ignore) setLeads([]);
        console.warn("Leads laden fehlgeschlagen:", e);
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Wenn MYTHIC gewählt → lootType auf VIP zwingen
  useEffect(() => {
    if (String(values.difficulty).toUpperCase() === "MYTHIC" && values.lootType !== "VIP") {
      setValues(v => ({ ...v, lootType: "VIP" }));
    }
  }, [values.difficulty]);

  const lootOptions = useMemo(() => {
    const d = String(values.difficulty || "").toUpperCase();
    if (d === "MYTHIC") return ["VIP"];                  // Vorgabe von dir
    return ["SAVED", "UNSAVED", "VIP"];
  }, [values.difficulty]);

<<<<<<< Updated upstream
  function setValue(key, val) {
    setValues(v => ({ ...v, [key]: val }));
=======
  const autoTitle = useMemo(() => {
    const diff = labelDifficulty(difficulty);
    const loot = labelLoot(lootType);
    if (isMythic) {
      const b = Math.max(1, Number(bosses) || 1);
      return `${DEFAULT_RAID_NAME} ${diff} ${loot} ${b}/8`;
    }
    return `${DEFAULT_RAID_NAME} ${diff} ${loot}`;
  }, [DEFAULT_RAID_NAME, difficulty, lootType, bosses, isMythic]);

  function clearError() {
    setError("");
>>>>>>> Stashed changes
  }

  /** Absenden: erstellt Raid und gibt { ok, id } zurück. */
  async function submit() {
<<<<<<< Updated upstream
    setSaving(true);
    setError("");

    try {
      // Payload 1:1 aus values schicken – du hast die Felder bereits im Form
      const payload = { ...values };

      // *** WICHTIG ***: Stelle sicher, dass der Lead-Feldname stimmt:
      // Backend nahm bei dir u.a. 'lead' (Discord-ID). Falls es 'leadId' o.ä. will:
      // const payload = { ...values, lead: values.lead ?? values.leadId ?? values.raidLeadId };

      const { res, data } = await fetchJSON("/api/raids", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newId = extractRaidId(res, data);
      if (!newId) {
        throw new Error("Raid-ID fehlt (Serverantwort enthielt keine ID).");
      }

      return { ok: true, id: newId, data };
=======
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      if (typeof onCreate !== "function") throw new Error("onCreate ist nicht definiert.");

      const when = date ? new Date(date) : new Date();
      const payload = {
        title: autoTitle,
        difficulty: difficulty || "HC",
        lootType: lootType || "vip",
        date: when.toISOString(),
        bosses: isMythic ? Number(bosses) || 8 : 8,
        lead: canPickLead ? (lead || null) : (me?.discordId ?? me?.id ?? null),
      };

      const res = await onCreate(payload);

      // Res darf sein: {ok:true, raid}, {raid}, {ok:true,id}, reines Raidobjekt
      const id =
        res?.raid?.id ?? res?.id ?? res?.raidId ?? res?.data?.id ?? res?.data?.raidId ?? null;

      if (!id) {
        const preview = JSON.stringify(res || {}, null, 0).slice(0, 160);
        throw new Error(`Raid-ID fehlt. Response: ${preview}`);
      }

      return { ok: true, id: Number(id), raid: res.raid ?? res };
>>>>>>> Stashed changes
    } catch (e) {
      setError(e?.message || "CREATE_FAILED");
      return { ok: false, error: e?.message || "CREATE_FAILED" };
    } finally {
      setSaving(false);
    }
  }

  return {
<<<<<<< Updated upstream
    values,
    setValue,
    leads,
    lootOptions,
    saving,
    error,
=======
    difficulty, setDifficulty,
    lootType,   setLootType,
    date,       setDate,
    bosses,     setBosses,
    lead,       setLead,

    isMythic,
    lootOptions,
    autoTitle,

    submitting,
    error,
    clearError,
>>>>>>> Stashed changes
    submit,
  };
}

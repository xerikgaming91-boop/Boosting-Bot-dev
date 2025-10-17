import { useEffect, useMemo, useState } from "react";

/* --------- helpers --------- */
const labelDifficulty = (d) => (d === "HC" || d === "Heroic" ? "HC" : d === "Mythic" ? "Mythic" : "Normal");
const labelLoot = (t) => {
  const v = String(t || "").toLowerCase();
  if (v === "vip") return "VIP";
  if (v === "saved") return "Saved";
  if (v === "unsaved") return "Unsaved";
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
};

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", ...(opts.headers || {}) },
    cache: "no-store",
    ...opts,
  });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    const pv = String(text).slice(0, 160).replace(/\s+/g, " ");
    throw new Error(`Erwartete JSON von ${url}, bekam "${ct || "unknown"}" (${res.status}). Preview: ${pv}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || data?.message || `HTTP_${res.status}`);
  return { res, data };
}

const extractId = (any) => {
  if (!any) return null;
  const id =
    any?.raid?.id ??
    any?.id ??
    any?.raidId ??
    any?.data?.id ??
    any?.data?.raidId ??
    null;
  return id != null ? Number(id) : null;
};

/* --------- hook --------- */
export default function useRaidCreateForm({ me, canPickLead, onCreate }) {
  const DEFAULT_RAID_NAME =
    (import.meta?.env?.VITE_DEFAULT_RAID_NAME || "Manaforge").toString().trim() || "Manaforge";

  const [difficulty, setDifficulty] = useState("HC");
  const [lootType, setLootType]     = useState("vip");
  const [date, setDate]             = useState("");
  const [bosses, setBosses]         = useState(8);
  const [lead, setLead]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  const isMythic = difficulty === "Mythic";

  useEffect(() => {
    if (isMythic) {
      if (!Number(bosses) || Number(bosses) < 1) setBosses(1);
      setLootType("vip");
    } else {
      setBosses(8);
      if (!["vip", "saved", "unsaved"].includes(String(lootType).toLowerCase())) setLootType("vip");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMythic]);

  const lootOptions = useMemo(
    () =>
      isMythic
        ? [{ value: "vip", label: "VIP" }]
        : [
            { value: "saved", label: "Saved" },
            { value: "unsaved", label: "Unsaved" },
            { value: "vip", label: "VIP" },
          ],
    [isMythic]
  );

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
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      if (typeof onCreate !== "function") throw new Error("onCreate ist nicht definiert.");

      const when = date ? new Date(date) : new Date();
      const payload = {
        title: autoTitle,
        difficulty,
        lootType,
        date: when.toISOString(),
        bosses: isMythic ? Number(bosses) || 8 : 8,
        lead: canPickLead ? (lead || null) : (me?.discordId ?? me?.id ?? null),
      };

      const res = await onCreate(payload);

      try {
        window.__BB_LAST_CREATE_FORM__ = { payload, response: res };
        console.log("[CreateForm] payload:", payload);
        console.log("[CreateForm] onCreate response:", res);
      } catch {}

      let id = extractId(res) || extractId(res?.raid);
      if (id) return { ok: true, id, raid: res.raid ?? res };

      // HARTE FALLBACKS – Liste scannen (±45 min, plus Felder)
      const { data } = await fetchJSON("/api/raids?_=" + Date.now());
      const list = Array.isArray(data?.raids) ? data.raids : Array.isArray(data) ? data : [];
      const whenMs = new Date(payload.date).getTime();

      const scored = list
        .map((r) => {
          const rDate = new Date(r.date || 0).getTime();
          const dt = Math.abs(rDate - whenMs);
          let s = dt <= 45 * 60 * 1000 ? Math.max(0, 10000000 - dt) : -1;
          if (s >= 0) {
            if (String(r.lead ?? "") === String(payload.lead ?? "")) s += 5000;
            const dEq =
              (String(r.difficulty).toLowerCase().startsWith("myth") && payload.difficulty === "Mythic") ||
              (["hc", "heroic"].includes(String(r.difficulty).toLowerCase()) && payload.difficulty === "HC") ||
              (String(r.difficulty).toLowerCase().startsWith("norm") && payload.difficulty === "Normal");
            if (dEq) s += 3000;
            const lEq = String(r.lootType || "").toLowerCase() === String(payload.lootType || "").toLowerCase();
            if (lEq) s += 2000;
            if (Number(r.bosses || 0) === Number(payload.bosses || 0)) s += 1000;
          }
          return { r, s };
        })
        .filter((x) => x.s >= 0)
        .sort((a, b) => b.s - a.s);

      const best = scored[0]?.r ?? null;

      try {
        window.__BB_LAST_CREATE_FORM__ = {
          ...(window.__BB_LAST_CREATE_FORM__ || {}),
          fallbackListSize: list.length,
          top5: scored.slice(0, 5),
          picked: best,
        };
        console.log("[CreateForm] fallback top5:", scored.slice(0, 5));
        console.log("[CreateForm] fallback picked:", best);
      } catch {}

      if (best?.id != null) return { ok: true, id: Number(best.id), raid: best };

      throw new Error("Raid-ID fehlt.");
    } catch (e) {
      console.error("[CreateForm] ERROR:", e?.message, e);
      setError(e?.message || "CREATE_FAILED");
      return { ok: false, error: e?.message || "CREATE_FAILED" };
    } finally {
      setSubmitting(false);
    }
  }

  return {
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
    submit,
  };
}

// src/frontend/features/raids/hooks/useRaidDetail.js
import { useEffect, useMemo, useState } from "react";
import { apiGetRaidById } from "@app/api/raidsAPI";
import {
  apiListRaidSignups,
  apiPickSignup,
  apiUnpickSignup,
} from "@app/api/signupsAPI";
import { apiGetMe } from "@app/api/usersAPI";
import { apiMyChars } from "@app/api/charsAPI";

/* ------------------------ helpers ------------------------ */
const U = (x) => String(x ?? "").toUpperCase();
const L = (x) => String(x ?? "").toLowerCase();

/* ------------------------ Number parsing (robust) ------------------------ */
function toNumberLoose(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const m = v.match(/-?\d+(?:[.,]\d+)?/);
    if (!m) return null;
    const s = m[0].replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function posNumLoose(v) {
  const n = toNumberLoose(v);
  return n && n > 0 ? n : null;
}

/* ------------------------ Small utils ------------------------ */
const U = (x) => String(x ?? "").toUpperCase();
const L = (x) => String(x ?? "").toLowerCase();

function normalizeBase(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
function normalizeRealm(s) {
  return normalizeBase(s).replace(/[\s'’\-_.]/g, "");
}
function makeKey(name, realm) {
  const n = normalizeBase(name);
  if (!n) return null;
  const r = normalizeRealm(realm || "");
  return r ? `${n}|${r}` : n;
}
function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function fmtDate(iso) {
  try {
    const d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return "-";
    return d.toLocaleString();
  } catch {
    return "-";
  }
}
function labelDiff(d) {
  const v = U(d);
  if (v === "HC") return "Heroic";
  if (v === "MYTHIC") return "Mythic";
  if (v === "NORMAL" || v === "NHC") return "Normal";
  return d || "-";
}
function labelLoot(l) {
  const v = L(l);
  if (v === "vip") return "VIP";
  if (v === "saved") return "Saved";
  if (v === "unsaved") return "UnSaved";
  return l || "-";
}
function roleKey(type) {
  const v = L(type);
  if (v.startsWith("tank")) return "tanks";
  if (v.startsWith("heal")) return "heals";
  if (v.startsWith("dps")) return "dps";
  if (v.startsWith("loot")) return "loot";
  return "dps";
}
function toViewRaid(raid) {
  if (!raid) return null;
  const leadLabel =
    raid.leadDisplayName ||
    raid.leadUsername ||
    raid.leadName ||
    raid.lead ||
    "-";
  return {
    id: raid.id,
    title: raid.title || "-",
    dateLabel: fmtDate(raid.date),
    diffLabel: labelDiff(raid.difficulty),
    lootLabel: labelLoot(raid.lootType),
    bosses: Number.isFinite(Number(raid.bosses)) ? raid.bosses : "-",
    leadLabel,
<<<<<<< HEAD
=======
    lead:
      raid.lead ?? raid.leadId ?? raid.leadDiscordId ?? raid.leadUserId ?? null,
>>>>>>> 741a4d8 (Edit form edit added)
  };
}

/* ------------------------ WarcraftLogs URL ------------------------ */
function buildWarcraftLogsUrl(name, realm, region) {
  if (!name || !realm) return null;
  const regionPart = String(region || "eu").toLowerCase();
  const realmPart = encodeURIComponent(String(realm).replace(/\s+/g, " "));
  const namePart = encodeURIComponent(String(name));
  return `https://www.warcraftlogs.com/character/${regionPart}/${realmPart}/${namePart}`;
}

/* ------------------------ Signup/Pick + Lockout ------------------------ */
function isSignupPicked(s) {
  const status = U(s?.status || s?.state || s?.signupStatus || "");
  return (
    !!s?.picked ||
    !!s?.isPicked ||
    status === "PICKED" ||
    status === "ACCEPTED" ||
    status === "CONFIRMED"
  );
}
function isCharLockoutSavedFrom(s, c) {
  const pickBool = (v) => (typeof v === "boolean" ? v : null);

  const b1 =
    pickBool(c?.saved) ??
    pickBool(c?.isSaved) ??
    pickBool(c?.lockoutSaved) ??
    pickBool(s?.char?.saved) ??
    pickBool(s?.char?.isSaved) ??
    pickBool(s?.char?.lockoutSaved) ??
    pickBool(s?.isSavedChar) ??
    null;
  if (b1 !== null) return b1;

  const txts = [
    c?.loot,
    c?.lootType,
    c?.status,
    c?.lockout,
    s?.char?.loot,
    s?.char?.lootType,
    s?.char?.status,
    s?.char?.lockout,
    s?.loot,
    s?.lockout,
  ]
    .map((x) => L(x || ""))
    .filter(Boolean);

  if (txts.some((t) => t === "saved")) return true;
  if (txts.some((t) => t === "unsaved")) return false;

  return false;
}

/* ------------------------ Payload Normalizer ------------------------ */
function normalizeSignupsPayload(payload) {
  if (!payload) return { picked: [], pending: [] };

<<<<<<< HEAD
  if (Array.isArray(payload.picked) || Array.isArray(payload.pending)) {
    return {
      picked: payload.picked || [],
      pending: payload.pending || [],
    };
=======
function resolveCharForSignup(s, idx) {
  if (!idx) return null;

  // by id
  const cid =
    s?.char?.id ?? s?.charId ?? s?.characterId ?? s?.userCharId ?? null;
  if (cid != null) {
    const hit = idx.byId.get(String(cid));
    if (hit) return hit;
>>>>>>> 741a4d8 (Edit form edit added)
  }

  const list = Array.isArray(payload?.signups)
    ? payload.signups
    : Array.isArray(payload)
    ? payload
    : [];

  return {
    picked: list.filter(isSignupPicked),
    pending: list.filter((s) => !isSignupPicked(s)),
  };
}

function normalizeCharsPayload(payload) {
  // Akzeptiere viele mögliche Shapes (BoosterChar etc.)
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload.chars,
    payload.boosterChars,
    payload.boosters,
    payload.characters,
    payload.data,
    payload.rows,
    payload.result,
    payload.list,
    payload.items,
    payload.records,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;

  // Prisma-FindMany direkt?
  if (Array.isArray(payload?.result?.data)) return payload.result.data;

  return [];
}

/* ------------------------ ItemLevel-Ermittlung ------------------------ */
function getCharIlvlFlat(c) {
  return (
    posNumLoose(c?.itemLevel) ??  // BoosterChar scheint "itemLevel" zu haben
    posNumLoose(c?.ilvl) ??
    posNumLoose(c?.iLvl) ??
    posNumLoose(c?.equippedItemLevel) ??
    posNumLoose(c?.item_level_equipped) ??
    posNumLoose(c?.equipped_ilvl) ??
    posNumLoose(c?.averageItemLevel) ??
    posNumLoose(c?.avgItemLevel) ??
    posNumLoose(c?.avg_ilvl) ??
    null
  );
}
function deepFindIlvl(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 6) return null;

  let best = null;
  const tryNum = (v) => {
    const n = posNumLoose(v);
    if (n && (!best || n > best)) best = n;
  };

  for (const [k, v] of Object.entries(obj)) {
    const key = String(k).toLowerCase();

    if (
      key === "itemlevel" ||
      /\bilvl\b/.test(key) ||
      /item.?level/.test(key) ||
      /avg.*ilvl/.test(key) ||
      /equipped.*ilvl/.test(key)
    ) {
      tryNum(v);
    }

    if (v && typeof v === "object") {
      const sub = deepFindIlvl(v, depth + 1);
      if (sub && (!best || sub > best)) best = sub;
    }
  }

  return best;
}
function resolveCharIlvl(c) {
  return getCharIlvlFlat(c) ?? deepFindIlvl(c) ?? null;
}

/* ------------------------ Char-Index (aus /api/*) ------------------------ */
function indexChars(chars) {
  const byId = new Map();
  const byKey = new Map();

  for (const c of chars) {
    const cid =
      c?.id ?? c?.charId ?? c?.characterId ?? c?.userCharId ?? null;
    if (cid != null) {
      byId.set(String(cid), c);
      byId.set(Number.isFinite(+cid) ? String(+cid) : String(cid), c); // doppelt sicher
    }

    const name = c?.name || c?.characterName;
    const realm =
      c?.realm ||
      c?.server ||
      c?.realmName ||
      c?.realm_slug ||
      c?.realmSlug ||
      null;

    const keys = uniq([
      makeKey(name, realm),
      makeKey(name, (realm || "").replace(/-/g, " ")),
      makeKey(name, (realm || "").replace(/\s+/g, "")),
      makeKey(name, ""), // Fallback: nur Name
    ]);
    for (const k of keys) if (k) byKey.set(k, c);
  }

  return { byId, byKey };
}
function candidateNamesFromSignup(s) {
  return uniq([
    s?.char?.name,
    s?.characterName,
    s?.name,
    s?.displayName?.split("-")?.[0],
  ]);
}
function candidateRealmsFromSignup(s) {
  return uniq([
    s?.char?.realm,
    s?.char?.server,
    s?.characterRealm,
    s?.realm,
    s?.server,
    s?.who?.split("-")?.[1],
  ]);
}
function resolveCharForSignup(s, index) {
  if (!index) return null;

  const cid =
    s?.char?.id ??
    s?.charId ??
    s?.characterId ??
    s?.userCharId ??
    null;
  if (cid != null) {
    const byIdHit = index.byId.get(String(cid));
    if (byIdHit) return byIdHit;
  }

  const names = candidateNamesFromSignup(s);
  const realms = candidateRealmsFromSignup(s);

  for (const n of names) {
    for (const r of realms) {
      const keys = uniq([
        makeKey(n, r),
        makeKey(n, (r || "").replace(/-/g, " ")),
        makeKey(n, (r || "").replace(/\s+/g, "")),
      ]);
      for (const k of keys) {
        const hit = k ? index.byKey.get(k) : null;
        if (hit) return hit;
      }
    }
    const k2 = makeKey(n, "");
    const hit2 = k2 ? index.byKey.get(k2) : null;
    if (hit2) return hit2;
  }

  return null;
}

/* ------------------------ Gruppierung + Enrichment ------------------------ */
function groupForView(signups, charIndex) {
  const base = () => ({ tanks: [], heals: [], dps: [], loot: [] });
  const grouped = { saved: base(), open: base() };

  const pushItem = (bucket, s) => {
    const c = resolveCharForSignup(s, charIndex);

    const charName = (c?.name || s?.char?.name || s?.characterName || s?.name || "").trim();
    const charRealm =
      (c?.realm ||
        c?.server ||
        s?.char?.realm ||
        s?.characterRealm ||
        s?.realm ||
        s?.char?.server ||
        s?.server ||
        "").trim();
    const charRegion = (c?.region || s?.char?.region || s?.region || "eu")?.toLowerCase();

    const rk = roleKey(s.type || s.role || s.class || c?.role || "dps");
    const who = charName ? `${charName}${charRealm ? "-" + charRealm : ""}` : (s.displayName || s.userId || "-");
    const classLabel = c?.class || s?.char?.class || s.class || "";
    const roleLabel = U(s.type || s.role || s.class || c?.role || "-");

    const ilvl =
      resolveCharIlvl(c) ??
      posNumLoose(s?.char?.ilvl) ??
      posNumLoose(s?.char?.itemLevel) ??
      posNumLoose(s?.itemLevel) ??
      posNumLoose(s?.ilvl) ??
      null;

    const lockoutSaved = isCharLockoutSavedFrom(s, c);
    const statusLabel = lockoutSaved ? "Saved" : "UnSaved";

    const logsUrl = buildWarcraftLogsUrl(charName, charRealm, charRegion);
    const picked = isSignupPicked(s);

    bucket[rk].push({
      id: s.id,
      who,
      classLabel,
      roleLabel,
      ilvl,            // <- kommt nun sicher aus BoosterChar.itemLevel
      lockoutSaved,
      statusLabel,
      picked,
      logsUrl,
      note: s.note || "",
    });
  };

  (signups.picked || []).forEach((s) => pushItem(grouped.saved, s));
  (signups.pending || []).forEach((s) => pushItem(grouped.open, s));
  return grouped;
}

/* ------------------------ Hook ------------------------ */
export default function useRaidDetail(raidId) {
  const [raid, setRaid] = useState(null);        // VIEW-Form
  const [grouped, setGrouped] = useState(null);  // { saved:{...}, open:{...} }
  const [me, setMe] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState("");
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [charIndex, setCharIndex] = useState(null);

  // Kandidaten-Endpunkte – enthält /api/chars und BoosterChar-Varianten
  const CHAR_ENDPOINTS = [
    "/api/chars",
    "/api/booster-chars",
    "/api/boosters/chars",
    "/api/booster/chars",
    "/api/characters",
    "/api/users/chars",
    "/api/chars/all",
  ];

  async function fetchCharsSmart() {
    for (const url of CHAR_ENDPOINTS) {
      try {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) continue;
        const data = await res.json();
        const list = normalizeCharsPayload(data);
        if (Array.isArray(list) && list.length) {
          const idx = indexChars(list);
          // leichte Telemetrie, damit man im DevTools sofort sieht, was gegriffen hat
          console.debug("[useRaidDetail] chars loaded from", url, "count:", list.length);
          return idx;
        }
      } catch {
        // probiere den nächsten
      }
    }
    console.debug("[useRaidDetail] no chars endpoint yielded results");
    return { byId: new Map(), byKey: new Map() };
  }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const [raidRaw, meRes, signupsRaw, idx] = await Promise.all([
        apiGetRaidById(raidId),
        apiGetMe().catch(() => ({ user: null })),
        apiListRaidSignups(raidId),
        fetchCharsSmart(),
      ]);

      setRaid(toViewRaid(raidRaw?.raid || raidRaw));
      setMe(meRes?.user || null);

      const signupsNorm = normalizeSignupsPayload(signupsRaw);
      setCharIndex(idx);
      setGrouped(groupForView(signupsNorm, idx));
    } catch (e) {
      setErr(e?.message || "LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!raidId) return;
    let aborted = false;
    (async () => {
      await load();
      if (aborted) return;
    })();
    return () => {
      aborted = true;
    };
  }, [raidId]);

  // permissions (Owner/Admin/Raidlead==lead)
  const canManage = useMemo(() => {
    if (!raid || !me) return false;
    const rl = me?.roleLevel ?? 0;
    const isOwner = !!me?.isOwner || rl >= 3;
    const isAdmin = !!me?.isAdmin || rl >= 2;
    const isLead =
      (me?.isRaidlead || rl >= 1) &&
      String(me.discordId || me.id || "") === String((raid && raid.lead) || "");
    return isOwner || isAdmin || isLead;
  }, [raid, me]);

  async function refreshSignupsWithChars() {
    const [signupsRaw, idx] = await Promise.all([
      apiListRaidSignups(raidId),
      charIndex ? Promise.resolve(charIndex) : fetchCharsSmart(),
    ]);
    const signupsNorm = normalizeSignupsPayload(signupsRaw);
    const effectiveIdx = charIndex || idx;
    if (!charIndex) setCharIndex(effectiveIdx);
    setGrouped(groupForView(signupsNorm, effectiveIdx));
  }

  async function pick(id) {
    if (!id || !canManage) return;
    setBusyIds((s) => new Set(s).add(id));
    try {
      await apiPickSignup(id);
      await refreshSignupsWithChars();
    } catch (e) {
      setErr(e?.message || "PICK_FAILED");
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  async function unpick(id) {
    if (!id || !canManage) return;
    setBusyIds((s) => new Set(s).add(id));
    try {
      await apiUnpickSignup(id);
      await refreshSignupsWithChars();
    } catch (e) {
      setErr(e?.message || "UNPICK_FAILED");
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  return {
    raid,          // { title, dateLabel, diffLabel, lootLabel, bosses, leadLabel }
    grouped,       // { saved:{tanks,heals,dps,loot}, open:{...} }
    canManage,
    loading,
    error,
    pick,
    unpick,
    busyIds,
    reload: load, // <<< neu
  };
}

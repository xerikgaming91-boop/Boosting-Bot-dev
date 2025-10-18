/* --------- Leads robust normalisieren ---------- */
function normalizeLeads(leads) {
  if (Array.isArray(leads)) return leads;
  if (Array.isArray(leads?.users)) return leads.users;
  if (Array.isArray(leads?.leads)) return leads.leads;
  if (leads && typeof leads === "object") {
    return Object.values(leads).filter((v) => v && typeof v === "object");
  }
  return [];
}
function getUserId(u) {
  return u?.id ?? u?.discordId ?? u?.userId ?? u?.snowflake ?? "";
}
function getUserLabel(u) {
  return (
    u?.displayName ||
    u?.username ||
    u?.global_name ||
    u?.nick ||
    u?.name ||
    u?.tag ||
    u?.discordTag ||
    getUserId(u) ||
    ""
  );
}
/* ---------------------------------------------- */

function leadLabel(leads, leadId) {
  const list = normalizeLeads(leads);
  if (!leadId) return "—";
  const u = list.find((x) => String(getUserId(x)) === String(leadId));
  return u ? getUserLabel(u) : String(leadId);
}

function fmtDate(ts) {
  // einfache, defensive Formatierung; passe an dein echtes Feld an
  try {
    const d = new Date(ts);
    if (!isNaN(d)) {
      const dd = d.toLocaleDateString("de-DE");
      const tt = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      return `${dd} ${tt}`;
    }
  } catch {}
  return ts ?? "—";
}

export function buildRaidRowsVm(raids = [], leads) {
  return (Array.isArray(raids) ? raids : []).map((r) => ({
    id: r.id ?? r.raidId ?? r._id,
    title: r.title ?? r.name ?? "Raid",
    dateLabel: fmtDate(r.date ?? r.start ?? r.startAt ?? r.scheduledAt),
    difficultyLabel: r.difficulty ?? r.diff ?? "—",
    lootLabel: r.lootType ?? r.loot ?? "—",
    leadLabel: leadLabel(leads, r.lead ?? r.leadId),
  }));
}

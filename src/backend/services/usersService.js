// src/backend/services/usersService.js
/**
 * Service-Layer für Users
 * - List/Get/Upsert/Update
 * - Rollen-Helfer
 * - getLeads(): Owner/Admin/Raidlead gefiltert & sortiert
 */

const { prisma } = require("../prismaClient.js");

// ---------- Helpers ----------
function normalizeUser(u) {
  if (!u) return null;
  return {
    discordId: u.discordId,
    username: u.username || null,
    displayName: u.displayName || null,
    avatarUrl: u.avatarUrl || null,

    // Rollen / Flags
    isOwner: !!u.isOwner,
    isAdmin: !!u.isAdmin,
    isRaidlead: !!u.isRaidlead,
    rolesCsv: u.rolesCsv || null,
    highestRole: u.highestRole || null,
    roleLevel: Number.isFinite(u.roleLevel) ? u.roleLevel : 0,

    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function highestRoleFromFlags(u) {
  if (u.isOwner) return "Owner";
  if (u.isAdmin) return "Admin";
  if (u.isRaidlead) return "Raidlead";
  return "User";
}
function roleLevelFromFlags(u) {
  if (u.isOwner) return 100;
  if (u.isAdmin) return 80;
  if (u.isRaidlead) return 60;
  // Booster könnte später via rolesCsv oder Flag kommen → hier 40 reserviert
  return 10;
}

function sortLeads(a, b) {
  // Owner (100) → Admin (80) → Raidlead (60) → dann Displayname
  const lvlA = a.roleLevel ?? 0;
  const lvlB = b.roleLevel ?? 0;
  if (lvlA !== lvlB) return lvlB - lvlA;
  const da = (a.displayName || a.username || a.discordId || "").toLowerCase();
  const db = (b.displayName || b.username || b.discordId || "").toLowerCase();
  return da.localeCompare(db);
}

// ---------- Service API ----------
exports.list = async ({ q } = {}) => {
  const where = q
    ? {
        OR: [
          { discordId: { contains: q } },
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      }
    : undefined;

  const rows = await prisma.user.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
  });
  return rows.map(normalizeUser);
};

exports.getOne = async (discordId) => {
  const u = await prisma.user.findUnique({ where: { discordId: String(discordId) } });
  return normalizeUser(u);
};

/**
 * Upsert per discordId – kann beim Login / Discord-Sync verwendet werden.
 * Optional: rolesCsv aus Discord speichern; Flags ableiten, falls nicht explizit übergeben.
 */
exports.upsert = async (data) => {
  const discordId = String(data.discordId);
  const incoming = {
    username: data.username ?? null,
    displayName: data.displayName ?? null,
    avatarUrl: data.avatarUrl ?? null,
    rolesCsv: data.rolesCsv ?? null,
    // Wenn Flags mitgegeben sind, nehmen wir sie, sonst leiten wir ab
    isOwner: data.isOwner ?? false,
    isAdmin: data.isAdmin ?? false,
    isRaidlead: data.isRaidlead ?? false,
  };

  // Falls Flags nicht gesetzt wurden, ggf. aus rolesCsv (IDs) ableiten – optional:
  // Hier nur Platzhalter; du kannst ENV-IDs mappen, wenn gewünscht.
  // const roleIds = (incoming.rolesCsv || "").split(",").map(s => s.trim()).filter(Boolean);
  // if (!data.isAdmin && ADMIN_ROLE_ID && roleIds.includes(ADMIN_ROLE_ID)) incoming.isAdmin = true;
  // if (!data.isRaidlead && RAIDLEAD_ROLE_ID && roleIds.includes(RAIDLEAD_ROLE_ID)) incoming.isRaidlead = true;

  // highestRole / roleLevel konsistent setzen
  const flagsForCalc = {
    isOwner: !!incoming.isOwner,
    isAdmin: !!incoming.isAdmin,
    isRaidlead: !!incoming.isRaidlead,
  };
  incoming.highestRole = highestRoleFromFlags(flagsForCalc);
  incoming.roleLevel = roleLevelFromFlags(flagsForCalc);

  const saved = await prisma.user.upsert({
    where: { discordId },
    update: incoming,
    create: { discordId, ...incoming },
  });

  return normalizeUser(saved);
};

/**
 * Partielle Updates (z. B. Rollen toggeln)
 */
exports.updateFields = async (discordId, patch) => {
  const updates = {
    username: patch.username !== undefined ? patch.username : undefined,
    displayName: patch.displayName !== undefined ? patch.displayName : undefined,
    avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : undefined,
    rolesCsv: patch.rolesCsv !== undefined ? patch.rolesCsv : undefined,
    isOwner: patch.isOwner !== undefined ? !!patch.isOwner : undefined,
    isAdmin: patch.isAdmin !== undefined ? !!patch.isAdmin : undefined,
    isRaidlead: patch.isRaidlead !== undefined ? !!patch.isRaidlead : undefined,
  };

  // Falls Flags geändert wurden → highestRole / roleLevel neu berechnen
  if (
    updates.isOwner !== undefined ||
    updates.isAdmin !== undefined ||
    updates.isRaidlead !== undefined
  ) {
    // Lade aktuelle Werte, mergen, dann ableiten
    const current = await prisma.user.findUnique({ where: { discordId: String(discordId) } });
    if (!current) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    const merged = {
      isOwner: updates.isOwner !== undefined ? updates.isOwner : current.isOwner,
      isAdmin: updates.isAdmin !== undefined ? updates.isAdmin : current.isAdmin,
      isRaidlead: updates.isRaidlead !== undefined ? updates.isRaidlead : current.isRaidlead,
    };
    updates.highestRole = highestRoleFromFlags(merged);
    updates.roleLevel = roleLevelFromFlags(merged);
  }

  const saved = await prisma.user.update({
    where: { discordId: String(discordId) },
    data: updates,
  });

  return normalizeUser(saved);
};

/**
 * Leads ermitteln (Owner/Admin/Raidlead), sortiert: Owner -> Admin -> Raidlead -> Name
 * Optional: Limit; Optional: nur aktive (hier alle, da kein „active“-Feld existiert).
 */
exports.getLeads = async ({ limit } = {}) => {
  const rows = await prisma.user.findMany({
    where: {
      OR: [{ isOwner: true }, { isAdmin: true }, { isRaidlead: true }],
    },
    // Wir sortieren in JS über roleLevel, um flexibel zu bleiben
  });

  const mapped = rows.map((u) => {
    const nu = normalizeUser(u);
    // safety fallback
    if (!nu.highestRole || !nu.roleLevel) {
      nu.highestRole = highestRoleFromFlags(nu);
      nu.roleLevel = roleLevelFromFlags(nu);
    }
    return nu;
  });

  mapped.sort(sortLeads);

  return typeof limit === "number" ? mapped.slice(0, Math.max(0, limit)) : mapped;
};

// src/backend/controllers/usersController.js
/**
 * Users Controller (MVC)
 * – liest/schreibt User inkl. Rollen über das userModel (Prisma-Repo)
 *
 * Routen (siehe routes/usersRoutes.js):
 *   GET    /api/users/me
 *   GET    /api/users/leads
 *   GET    /api/users
 *   POST   /api/users/upsert
 *   PATCH  /api/users/:discordId/roles
 */

const users = require("../models/userModel");

/* --------------------------- Helpers ---------------------------------- */

function requireAuthLocal(req, res) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    return false;
  }
  return true;
}
function requireAdminOrOwnerLocal(req, res) {
  if (!requireAuthLocal(req, res)) return false;
  if (req.user.isOwner || req.user.isAdmin) return true;
  res.status(403).json({ ok: false, error: "FORBIDDEN", needAnyOf: ["admin", "owner"] });
  return false;
}

function normalizeBool(v) {
  if (typeof v === "boolean") return v;
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return undefined;
}

function computeRoleMeta({ isOwner, isAdmin, isRaidlead, rolesCsv }) {
  let level = 0;
  let highest = null;
  if (isRaidlead) { level = Math.max(level, 1); highest = highest || "raidlead"; }
  if (isAdmin)    { level = Math.max(level, 2); highest = "admin"; }
  if (isOwner)    { level = 3; highest = "owner"; }

  if (rolesCsv) {
    const set = new Set(
      String(rolesCsv)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    if (set.has("raidlead")) { level = Math.max(level, 1); highest = highest || "raidlead"; }
    if (set.has("admin"))    { level = Math.max(level, 2); highest = level < 2 ? "admin" : highest; }
    if (set.has("owner"))    { level = 3; highest = "owner"; }
  }

  return { highestRole: highest, roleLevel: level };
}

/* --------------------------- Controller -------------------------------- */

/** GET /api/users/me – eingeloggter User (fresh aus DB) */
async function getMe(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const me = await users.findOne(req.user.discordId);
    if (!me) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
    return res.json({ ok: true, user: me });
  } catch (e) {
    console.error("[users/getMe] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/users/leads – alle (raidlead|admin|owner) */
async function getLeads(_req, res) {
  try {
    const rows = await users.findMany({
      where: { OR: [{ isRaidlead: true }, { isAdmin: true }, { isOwner: true }] },
      orderBy: [{ isOwner: "desc" }, { isAdmin: "desc" }, { isRaidlead: "desc" }, { displayName: "asc" }],
    });

    const payload = rows.map((u) => ({
      discordId: u.discordId,
      username: u.username,
      displayName: u.displayName || u.username || u.discordId,
      avatarUrl: u.avatarUrl,
      isOwner: u.isOwner,
      isAdmin: u.isAdmin,
      isRaidlead: u.isRaidlead,
    }));
    return res.json({ ok: true, leads: payload });
  } catch (e) {
    console.error("[users/getLeads] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/users – nur admin/owner; optional ?q= */
async function listUsers(req, res) {
  if (!requireAdminOrOwnerLocal(req, res)) return;
  try {
    const q = (req.query?.q || "").toString().trim();
    const where = q
      ? {
          OR: [
            { displayName: { contains: q } },
            { username: { contains: q } },
            { discordId: { contains: q } },
          ],
        }
      : {};
    const rows = await users.findMany({ where, orderBy: [{ createdAt: "desc" }] });
    return res.json({ ok: true, users: rows });
  } catch (e) {
    console.error("[users/listUsers] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** POST /api/users/upsert – admin/owner */
async function upsertUser(req, res) {
  if (!requireAdminOrOwnerLocal(req, res)) return;
  try {
    const {
      discordId,
      username,
      displayName,
      avatarUrl,
      isOwner,
      isAdmin,
      isRaidlead,
      rolesCsv,
    } = req.body || {};

    if (!discordId || typeof discordId !== "string") {
      return res.status(400).json({ ok: false, error: "discordId_required" });
    }

    const patch = {
      username: username ?? undefined,
      displayName: displayName ?? undefined,
      avatarUrl: avatarUrl ?? undefined,
      isOwner: normalizeBool(isOwner),
      isAdmin: normalizeBool(isAdmin),
      isRaidlead: normalizeBool(isRaidlead),
      rolesCsv: rolesCsv != null ? String(rolesCsv) : undefined,
    };

    const { highestRole, roleLevel } = computeRoleMeta({
      isOwner: !!patch.isOwner,
      isAdmin: !!patch.isAdmin,
      isRaidlead: !!patch.isRaidlead,
      rolesCsv: patch.rolesCsv,
    });

    patch.highestRole = highestRole;
    patch.roleLevel = roleLevel;

    const saved = await users.upsert({ discordId, ...patch });
    return res.status(201).json({ ok: true, user: saved });
  } catch (e) {
    console.error("[users/upsertUser] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** PATCH /api/users/:discordId/roles – admin/owner */
async function updateRoles(req, res) {
  if (!requireAdminOrOwnerLocal(req, res)) return;
  try {
    const discordId = String(req.params.discordId || "");
    if (!discordId) return res.status(400).json({ ok: false, error: "discordId_required" });

    const patch = {
      isOwner: normalizeBool(req.body?.isOwner),
      isAdmin: normalizeBool(req.body?.isAdmin),
      isRaidlead: normalizeBool(req.body?.isRaidlead),
      rolesCsv: req.body?.rolesCsv != null ? String(req.body.rolesCsv) : undefined,
    };

    const { highestRole, roleLevel } = computeRoleMeta({
      isOwner: !!patch.isOwner,
      isAdmin: !!patch.isAdmin,
      isRaidlead: !!patch.isRaidlead,
      rolesCsv: patch.rolesCsv,
    });

    const saved = await users.update(discordId, {
      ...patch,
      highestRole,
      roleLevel,
    });

    return res.json({ ok: true, user: saved });
  } catch (e) {
    console.error("[users/updateRoles] error:", e);
    if (e?.code === "P2025") {
      return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
    }
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  getMe,
  getLeads,
  listUsers,
  upsertUser,
  updateRoles,
};

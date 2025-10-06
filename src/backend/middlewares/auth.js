// src/backend/middlewares/auth.js
/**
 * Einheitliche Auth-Middlewares:
 * - attachUser: holt den User robust aus der Session und setzt req.user
 * - requireAuth: blockt, wenn kein req.user vorhanden
 * - requireAnyRole(minLevel): erzwingt Mindest-Rollenlevel (Raidlead=1, Admin=2, Owner=3)
 * - setSessionUser(req, user): Helfer, um beim OAuth-Callback die Session zu füllen
 */

function coerceRoleLevel(u) {
  if (!u) return 0;
  if (Number.isFinite(u.roleLevel)) return u.roleLevel;
  if (u.isOwner) return 3;
  if (u.isAdmin) return 2;
  if (u.isRaidlead) return 1;
  return 0;
}

function sanitizeUser(u) {
  if (!u) return null;
  return {
    discordId: String(u.discordId || u.id || ""),
    username: u.username ?? null,
    displayName: u.displayName ?? u.global_name ?? u.username ?? null,
    avatarUrl: u.avatarUrl ?? u.avatar_url ?? u.avatar ?? null,

    isOwner: !!u.isOwner,
    isAdmin: !!u.isAdmin,
    isRaidlead: !!u.isRaidlead,

    rolesCsv: u.rolesCsv ?? null,
    highestRole: u.highestRole ?? null,
    roleLevel: Number.isFinite(u.roleLevel) ? u.roleLevel : coerceRoleLevel(u),
  };
}

/**
 * Versucht User an verschiedenen Session-Pfaden zu finden (robust gegen alte Implementationen)
 */
function readUserFromSession(sess) {
  if (!sess) return null;

  // Bevorzugt: req.session.user
  if (sess.user) return sanitizeUser(sess.user);

  // Kompatibilität: frühere Varianten
  if (sess.currentUser) return sanitizeUser(sess.currentUser);
  if (sess.auth?.user) return sanitizeUser(sess.auth.user);
  if (sess.discord?.user) return sanitizeUser(sess.discord.user);
  if (sess.profile) return sanitizeUser(sess.profile);

  return null;
}

/** Middleware: req.user aus Session anhängen (oder null) */
function attachUser(req, _res, next) {
  try {
    req.user = readUserFromSession(req.session);
  } catch {
    req.user = null;
  }
  next();
}

/** Guard: benötigt eingeloggt */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  }
  next();
}

/** Guard: benötigt Mindest-Rollenlevel (Raidlead=1, Admin=2, Owner=3) */
function requireAnyRole(minLevel = 1) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    }
    const lvl = coerceRoleLevel(req.user);
    if (lvl >= minLevel) return next();
    return res.status(403).json({ ok: false, error: "FORBIDDEN", needMinLevel: minLevel });
  };
}

/**
 * Helfer: beim OAuth-Callback den DB-User in die Session schreiben
 * (in deinem authController nach erfolgreichem Upsert aufrufen)
 */
function setSessionUser(req, user) {
  const clean = sanitizeUser(user);
  req.session.user = clean;
  // optional: sofort persistieren
  typeof req.session.save === "function" && req.session.save(() => {});
  return clean;
}

module.exports = {
  attachUser,
  requireAuth,
  requireAnyRole,
  setSessionUser,
};

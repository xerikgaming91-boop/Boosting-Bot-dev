// src/backend/controllers/charsController.js
/**
 * Chars Controller (MVC – schlank, Service-zentriert)
 *
 * Erwartete Routen (typisch in routes/charsRoutes.js):
 *   GET    /api/chars/my                      → listMine
 *   GET    /api/chars/user/:discordId         → listByUser   (lead/admin/owner ODER self)
 *   GET    /api/chars/:id                     → getOne       (lead/admin/owner ODER owner des Chars)
 *   POST   /api/chars                         → create       (auth; legt Char für req.user an)
 *   PATCH  /api/chars/:id                     → update       (lead/admin/owner ODER owner des Chars)
 *   DELETE /api/chars/:id                     → remove       (lead/admin/owner ODER owner des Chars)
 */

const svc = require("../services/charService");

function requireAuthLocal(req, res) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    return false;
  }
  return true;
}
function isLead(u) {
  return !!u && (u.isRaidlead || u.isAdmin || u.isOwner);
}
function isSelf(req, discordId) {
  return String(req.user?.discordId || "") === String(discordId || "");
}

/* --------------------------------- GETs --------------------------------- */

// Eigene Chars
async function listMine(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const rows = await svc.listByUser(req.user.discordId);
    return res.json({ ok: true, chars: rows });
  } catch (e) {
    console.error("[chars/listMine] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// Chars eines Users (nur self oder Lead/Admin/Owner)
async function listByUser(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const discordId = String(req.params.discordId || "");
    if (!discordId) return res.status(400).json({ ok: false, error: "discordId_required" });

    if (!isLead(req.user) && !isSelf(req, discordId)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const rows = await svc.listByUser(discordId);
    return res.json({ ok: true, chars: rows });
  } catch (e) {
    console.error("[chars/listByUser] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// Einzelner Char (nur self oder Lead/Admin/Owner)
async function getOne(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const row = await svc.getChar(id);
    if (!row) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });

    if (!isLead(req.user) && !isSelf(req, row.userId)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    return res.json({ ok: true, char: row });
  } catch (e) {
    console.error("[chars/getOne] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/* -------------------------------- Writes -------------------------------- */

// Neuen Char für eingeloggten User anlegen
async function create(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const body = req.body || {};
    const payload = {
      userId: req.user.discordId, // owner ist immer der eingeloggte User
      name: body.name,
      realm: body.realm,
      class: body.class,
      spec: body.spec,
      rioScore: body.rioScore,
      progress: body.progress,
      itemLevel: body.itemLevel,
      wclUrl: body.wclUrl,
    };

    const created = await svc.createChar(payload);
    return res.status(201).json({ ok: true, char: created });
  } catch (e) {
    // P2002: Unique (userId,name,realm)
    if (e?.code === "P2002") {
      return res.status(409).json({ ok: false, error: "CHAR_ALREADY_EXISTS" });
    }
    if (e?.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    console.error("[chars/create] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// Char ändern (nur owner oder Lead/Admin/Owner)
async function update(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const current = await svc.getChar(id);
    if (!current) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });

    if (!isLead(req.user) && !isSelf(req, current.userId)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const patch = { ...(req.body || {}) };
    // Schutz: userId darf nicht beliebig geändert werden
    if (!isLead(req.user)) delete patch.userId;

    const saved = await svc.updateChar(id, patch);
    return res.json({ ok: true, char: saved });
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ ok: false, error: "CHAR_ALREADY_EXISTS" });
    }
    if (e?.code === "P2025") {
      return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    }
    console.error("[chars/update] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// Char löschen (nur owner oder Lead/Admin/Owner)
async function remove(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const current = await svc.getChar(id);
    if (!current) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });

    if (!isLead(req.user) && !isSelf(req, current.userId)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const deleted = await svc.deleteChar(id);
    return res.json({ ok: true, char: deleted });
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    }
    console.error("[chars/remove] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  listMine,
  listByUser,
  getOne,
  create,
  update,
  remove,
};

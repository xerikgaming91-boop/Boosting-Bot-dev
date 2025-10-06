// src/backend/routes/charsRoutes.js
/**
 * Chars Routes (MVC)
 * - Controller: src/backend/controllers/charsController.js
 * - Auth: src/backend/middleware/auth.js (attachUser, requireAuth)
 *
 * Mount in server.js erfolgt unter /api und /api/chars.
 * Pfade relativ zum Mount:
 *   GET    /my
 *   GET    /user/:discordId
 *   GET    /:id
 *   POST   /
 *   PATCH  /:id
 *   DELETE /:id
 */

const express = require("express");
const router = express.Router();
const path = require("path");

const ctrl = require("../controllers/charsController");
// 🔧 WICHTIG: Resolver stabil über __dirname + explizite .js-Endung
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

// Session-User anheften
router.use(attachUser);

/* ------------------------------- Reads ---------------------------------- */

// Eigene Chars
router.get("/my", requireAuth, ctrl.listMine);

// Chars eines bestimmten Users (nur self oder Lead/Admin/Owner)
router.get("/user/:discordId", requireAuth, ctrl.listByUser);

// Einzelner Char (nur owner oder Lead/Admin/Owner)
router.get("/:id", requireAuth, ctrl.getOne);

/* ------------------------------ Writes ---------------------------------- */

// Neuen Char anlegen (owner = eingeloggter User)
router.post("/", requireAuth, ctrl.create);

// Char aktualisieren
router.patch("/:id", requireAuth, ctrl.update);

// Char löschen
router.delete("/:id", requireAuth, ctrl.remove);

/* ------------------------------ Export ---------------------------------- */

module.exports = {
  basePath: "/chars",
  router,
};

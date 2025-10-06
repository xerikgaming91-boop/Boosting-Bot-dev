// src/backend/routes/presetsRoutes.js
/**
 * Presets Routes (MVC)
 * - Controller: src/backend/controllers/presetsController.js
 * - Auth: src/backend/middleware/auth.js (attachUser, requireAuth)
 *
 * Mount in server.js unter /api und /api/presets.
 * Pfade relativ zum Mount:
 *   GET    /           → list
 *   GET    /:id        → getOne
 *   POST   /           → create        (lead/admin/owner)
 *   PATCH  /:id        → update        (lead/admin/owner)
 *   DELETE /:id        → remove        (lead/admin/owner)
 */

const express = require("express");
const router = express.Router();
const path = require("path");

const ctrl = require("../controllers/presetsController");
// 🔧 WICHTIG: Resolver stabil über __dirname + explizite .js-Endung
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

// Session-User bereitstellen
router.use(attachUser);

/* ------------------------------- Reads ---------------------------------- */

// Alle Presets (öffentlich)
router.get("/", ctrl.list);

// Einzelnes Preset (öffentlich)
router.get("/:id", ctrl.getOne);

/* ------------------------------ Writes ---------------------------------- */

// Anlegen (nur eingeloggte; Rollen-Check macht Controller)
router.post("/", requireAuth, ctrl.create);

// Ändern (nur eingeloggte; Rollen-Check macht Controller)
router.patch("/:id", requireAuth, ctrl.update);

// Löschen (nur eingeloggte; Rollen-Check macht Controller)
router.delete("/:id", requireAuth, ctrl.remove);

/* ------------------------------ Export ---------------------------------- */

module.exports = {
  basePath: "/presets",
  router,
};

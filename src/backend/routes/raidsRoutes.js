// src/backend/routes/raidsRoutes.js
/**
 * Raids Routes (MVC)
 * - Controller: src/backend/controllers/raidsController.js
 * - Auth: src/backend/middleware/auth.js (attachUser, requireAuth)
 *
 * Mount in server.js erfolgt unter /api und /api/raids.
 * Die Pfade unten sind relativ zum mount:
 *   GET    /          → list
 *   GET    /:id       → getOne
 *   POST   /          → create           (lead/admin/owner)
 *   PATCH  /:id       → update           (lead/admin/owner)
 *   DELETE /:id       → remove           (lead/admin/owner)
 *   POST   /:raidId/picks/:signupId   → pick    (lead/admin/owner)
 *   DELETE /:raidId/picks/:signupId   → unpick  (lead/admin/owner)
 */

const express = require("express");
const router = express.Router();
const path = require("path");

const ctrl = require("../controllers/raidsController");
// 🔧 WICHTIG: Resolver stabil über __dirname + explizite .js-Endung
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

// Session-User (aus Cookie/Header) anhängen
router.use(attachUser);

/* ------------------------------- Reads ---------------------------------- */

// Liste aller Raids (öffentlich)
router.get("/", ctrl.list);

// „Full“-Detail eines Raids (öffentlich)
router.get("/:id", ctrl.getOne);

/* ------------------------------ Writes ---------------------------------- */

// Anlegen (nur eingeloggte; Rollen-Check macht Controller)
router.post("/", requireAuth, ctrl.create);

// Patch (nur eingeloggte; Rollen-Check macht Controller)
router.patch("/:id", requireAuth, ctrl.update);

// Löschen (nur eingeloggte; Rollen-Check macht Controller)
router.delete("/:id", requireAuth, ctrl.remove);

// Picks (nur eingeloggte; Rollen-Check macht Controller)
router.post("/:raidId/picks/:signupId", requireAuth, ctrl.pick);
router.delete("/:raidId/picks/:signupId", requireAuth, ctrl.unpick);

/* ------------------------------ Export ---------------------------------- */

module.exports = {
  basePath: "/raids",
  router,
};

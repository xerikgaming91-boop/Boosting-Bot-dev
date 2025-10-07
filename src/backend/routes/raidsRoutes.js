// src/backend/routes/raidsRoutes.js
/**
 * Raids Routes (MVC)
 * Controller:  src/backend/controllers/raidsController.js
 * Auth:        src/backend/middlewares/auth.js  (attachUser, requireAuth)
 *
 * Wird in server.js unter /api und /api/raids gemountet.
 */

const express = require("express");
const path = require("path");
const router = express.Router();

const ctrl = require("../controllers/raidsController.js");
// Wichtig: korrekter Pfad + .js (Windows / require)
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

// Session-User für alle Raid-Routen anhängen
router.use(attachUser);

/* ------------------------------- Reads ---------------------------------- */

// Liste aller Raids (öffentlich)
router.get("/", ctrl.list);

// Detail eines Raids (öffentlich)
router.get("/:id", ctrl.getOne);

/* ------------------------------ Writes ---------------------------------- */

// Anlegen (nur eingeloggte; Rollen-Check macht Controller)
router.post("/", requireAuth, ctrl.create);

// Aktualisieren (nur eingeloggte; Rollen-Check macht Controller)
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

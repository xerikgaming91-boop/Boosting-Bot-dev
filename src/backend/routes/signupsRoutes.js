// src/backend/routes/signupsRoutes.js
/**
 * Signups Routes (MVC)
 * - Controller: src/backend/controllers/signupsController.js
 * - Auth: src/backend/middleware/auth.js (attachUser, requireAuth)
 *
 * Der Server mounted diese Routes unter /api und /api/signups.
 * Dadurch funktionieren sowohl:
 *   /api/signups/*   (signups-spezifisch)
 *   /api/raids/*     (raid-bezogene Signups-Endpunkte)
 */

const express = require("express");
const router = express.Router();
const path = require("path");

const ctrl = require("../controllers/signupsController");
// 🔧 WICHTIG: Resolver stabil über __dirname + explizite .js-Endung
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

// Session-User anheften (liest Cookie/Token)
router.use(attachUser);

/* ----------------------- Raid-bezogene Signups -------------------------- */

// Alle Signups eines Raids (public read)
router.get("/raids/:raidId/signups", ctrl.listForRaid);

// Signup eines Chars aus einem Raid entfernen (auth; Owner oder Lead/Admin/Owner)
router.delete("/raids/:raidId/signups/:charId", requireAuth, ctrl.removeByRaidAndChar);

/* --------------------------- Eigene Signups ----------------------------- */

// Meine Signups (auth)
router.get("/signups/my", requireAuth, ctrl.listMine);

/* ----------------------------- Signups CRUD ----------------------------- */

// Einzelnes Signup lesen (auth; Owner oder Lead/Admin/Owner)
router.get("/signups/:id", requireAuth, ctrl.getOne);

// Signup anlegen (auth; Owner oder Lead/Admin/Owner für PICKED)
router.post("/signups", requireAuth, ctrl.create);

// Upsert per (raidId,charId) (auth)
router.put("/signups/upsert", requireAuth, ctrl.upsertByKey);

// Signup ändern (auth; Owner oder Lead/Admin/Owner)
router.patch("/signups/:id", requireAuth, ctrl.update);

// Signup löschen (auth; Owner oder Lead/Admin/Owner)
router.delete("/signups/:id", requireAuth, ctrl.remove);

/* -------------------------------- Export -------------------------------- */

module.exports = {
  basePath: "/signups",
  router,
};

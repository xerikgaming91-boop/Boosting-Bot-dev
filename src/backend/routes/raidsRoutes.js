// src/backend/routes/raidsRoutes.js
/**
 * Raids Routes (MVC)
 * Mount in server.js: unter /api und /api/raids
 */

const express = require("express");
const path = require("path");
const router = express.Router();

const ctrl = require("../controllers/raidsController.js");
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

// Session-User anhängen (für Rollenprüfung downstream)
router.use(attachUser);

// Öffentliche Reads
router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);

// Writes (nur eingeloggte; Rolle ggf. in Middleware/Controller prüfen)
router.post("/", requireAuth, ctrl.create);
router.patch("/:id", requireAuth, ctrl.update);
router.delete("/:id", requireAuth, ctrl.remove);

// Falls du Picks an dieser Stelle haben willst, bitte im Signups-Feature lassen,
// oder hier bewusst einhängen und im Service kapseln:
// router.post("/:raidId/picks/:signupId", requireAuth, ctrl.pick);
// router.delete("/:raidId/picks/:signupId", requireAuth, ctrl.unpick);

module.exports = {
  basePath: "/raids",
  router,
};

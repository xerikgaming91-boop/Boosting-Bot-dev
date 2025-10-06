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

// ⚠️ Nur numerische IDs erlauben – vermeidet /undefined → INVALID_ID
router.get("/:id(\\d+)", ctrl.getById);

// Writes (nur eingeloggte; Rolle ggf. in Middleware/Controller prüfen)
router.post("/", requireAuth, ctrl.create);
router.patch("/:id(\\d+)", requireAuth, ctrl.update);
router.delete("/:id(\\d+)", requireAuth, ctrl.remove);

module.exports = {
  basePath: "/raids",
  router,
};

// src/backend/routes/myRaidsRoutes.js
/**
 * MyRaids Routes (MVC)
 * - Controller: src/backend/controllers/myRaidsController.js
 * - Auth: src/backend/middleware/auth.js (attachUser, requireAuth)
 *
 * Mount in server.js: unter /api und /api/my-raids
 * Pfade relativ zum Mount:
 *   GET /          → listAll        (upcoming + past)
 *   GET /upcoming  → listUpcoming
 *   GET /past      → listPast
 */

const express = require("express");
const router = express.Router();
const path = require("path");

const ctrl = require("../controllers/myRaidsController");
// 🔧 WICHTIG: Resolver stabil über __dirname + explizite .js-Endung
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

// Session-User anhängen + Auth erzwingen
router.use(attachUser);
router.use(requireAuth);

/* ------------------------------- Routes --------------------------------- */

router.get("/", ctrl.listAll);
router.get("/upcoming", ctrl.listUpcoming);
router.get("/past", ctrl.listPast);

/* -------------------------------- Export -------------------------------- */

module.exports = {
  basePath: "/my-raids",
  router,
};

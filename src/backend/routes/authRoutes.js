// src/backend/routes/authRoutes.js
/**
 * Auth-Routen
 * - Dünner Router, delegiert an Controller (der Service-Schicht nutzt)
 * - attachUser sorgt dafür, dass /session den User aus der Session liefert
 */

const express = require("express");
const ctrl = require("../controllers/authController.js");
const { attachUser } = require("../middlewares/auth.js");

const router = express.Router();

// Session-User an req.user hängen (nur Lesezwecke hier)
router.use(attachUser);

// OAuth2: Login → Redirect zu Discord
router.get("/auth/discord/login", ctrl.discordLogin);

// OAuth2: Callback von Discord
router.get("/auth/discord/callback", ctrl.discordCallback);

// Aktuelle Session lesen
router.get("/auth/session", ctrl.getSession);

// Logout (Session zerstören)
router.post("/auth/logout", ctrl.logout);

// Export nach server.js Autoload
module.exports = {
  basePath: "/auth",
  router,
};

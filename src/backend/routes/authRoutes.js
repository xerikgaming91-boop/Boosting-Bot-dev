// src/backend/routes/authRoutes.js
// CommonJS, wird automatisch unter /api/auth gemountet

const express = require("express");
const router = express.Router();

const { attachUser } = require("../middlewares/auth.js");
const ctrlRaw = require("../controllers/authController.js");

// Fallback falls versehentlich als default exportiert
const ctrl = ctrlRaw && ctrlRaw.default ? ctrlRaw.default : ctrlRaw;

// No-Cache Middleware gegen 304 auf /login & /session
function noCache(_req, res, next) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
}

// Session-User an req hängen
router.use(attachUser);

// OAuth Start (zwei Aliase – dein Frontend nutzt /login)
router.get("/login", noCache, ctrl.start);
router.get("/discord", noCache, ctrl.start);

// OAuth Callback
router.get("/callback", ctrl.callback);

// Session-Info
router.get("/session", noCache, ctrl.session);

// Logout
router.post("/logout", ctrl.logout);

module.exports = { basePath: "/auth", router };

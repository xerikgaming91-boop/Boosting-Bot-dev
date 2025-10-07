// src/backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const { attachUser } = require("../middlewares/auth.js");
const ctrlRaw = require("../controllers/authController.js");
const ctrl = ctrlRaw && ctrlRaw.default ? ctrlRaw.default : ctrlRaw;

function noCache(_req, res, next) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
}

router.use(attachUser);

router.get("/login", noCache, ctrl.start);
router.get("/discord", noCache, ctrl.start);

router.get("/callback", ctrl.callback);

router.get("/session", noCache, ctrl.session);

// Logout: sowohl GET als auch POST anbieten
router.get("/logout", ctrl.logout);
router.post("/logout", ctrl.logout);

module.exports = { basePath: "/auth", router };

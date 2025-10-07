// src/backend/routes/usersRoutes.js
// CommonJS-Router – wird von deinem Auto-Mount unter /api registriert

const express = require("express");
const router = express.Router();

// Pfade RELATIV zum routes/-Ordner:
const { attachUser } = require("../middlewares/auth.js");
const ctrlRaw = require("../controllers/usersController.js");

// Fallback, falls der Controller versehentlich als ESM default exportiert wurde:
const ctrl = ctrlRaw && ctrlRaw.default ? ctrlRaw.default : ctrlRaw;

// Session-User an req hängen (damit /me funktioniert)
router.use(attachUser);

// Endpunkte
router.get("/me", ctrl.me);        // → { ok:true, user: {...} | null }
router.get("/leads", ctrl.leads);  // → { ok:true, leads: [...] }

module.exports = {
  basePath: "/users",
  router,
};

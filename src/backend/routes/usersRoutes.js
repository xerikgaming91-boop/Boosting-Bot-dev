// src/backend/routes/usersRoutes.js
// Mount: /api/users

const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/usersController.js");

// /me: immer erreichbar – liefert user=null, wenn nicht eingeloggt
router.get("/me", ctrl.getMe);

// Leads-Liste (öffentlich oder hinter Auth; bei Bedarf hier absichern)
router.get("/leads", ctrl.listLeads);

module.exports = {
  basePath: "/users",
  router,
};

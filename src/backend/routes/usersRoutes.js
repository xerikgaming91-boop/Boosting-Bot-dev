// src/backend/routes/usersRoutes.js
/**
 * Users-Routen (MVC)
 * - dünner Router, delegiert an Controller
 * - Auth wird über Middlewares geregelt
 *
 * Endpunkte:
 *   GET    /api/users/me                 → getMe            (auth)
 *   GET    /api/users/leads              → getLeads         (public)
 *   GET    /api/users                    → listUsers        (admin/owner)
 *   POST   /api/users/upsert             → upsertUser       (admin/owner)
 *   PATCH  /api/users/:discordId/roles   → updateRoles      (admin/owner)
 */

const express = require("express");
const ctrl = require("../controllers/usersController.js");
const { attachUser, requireAuth, requireAnyRole } = require("../middlewares/auth.js");

const router = express.Router();

// User aus Session anhängen (setzt req.user oder null)
router.use(attachUser);

// Aktueller User (muss eingeloggt sein)
router.get("/users/me", requireAuth, ctrl.getMe);

// Leads/Admins/Owner – für Dropdowns, darf öffentlich sein (oder: requireAuth, wenn gewünscht)
router.get("/users/leads", ctrl.getLeads);

// Admin-/Owner-Bereich
router.get("/users", requireAnyRole(2), ctrl.listUsers); // 2 = Admin+
router.post("/users/upsert", requireAnyRole(2), ctrl.upsertUser);
router.patch("/users/:discordId/roles", requireAnyRole(2), ctrl.updateRoles);

// Export für server.js (Autoload)
module.exports = {
  basePath: "/users",
  router,
};

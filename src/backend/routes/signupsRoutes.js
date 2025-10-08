// src/backend/routes/signupsRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");

const ctrl = require("../controllers/signupsController");
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

router.use(attachUser);

// Raid-bezogene Signups
router.get("/raids/:raidId/signups", ctrl.listForRaid);
router.delete("/raids/:raidId/signups/:charId", requireAuth, ctrl.removeByRaidAndChar);

// Eigene Signups
router.get("/signups/my", requireAuth, ctrl.listMine);

// Signups CRUD
router.get("/signups/:id", requireAuth, ctrl.getOne);
router.post("/signups", requireAuth, ctrl.create);
router.put("/signups/upsert", requireAuth, ctrl.upsertByKey);
router.patch("/signups/:id", requireAuth, ctrl.update);
router.delete("/signups/:id", requireAuth, ctrl.remove);

// Pick / Unpick
router.post("/signups/:id/pick", requireAuth, ctrl.pick);
router.delete("/signups/:id/pick", requireAuth, ctrl.unpick);

// Legacy-Aliase (Kompatibilität)
router.post("/raids/:raidId/picks/:signupId", requireAuth, ctrl.pickByRaidPath);
router.delete("/raids/:raidId/picks/:signupId", requireAuth, ctrl.unpickByRaidPath);

module.exports = {
  basePath: "/signups",
  router,
};

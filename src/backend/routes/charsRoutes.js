// src/backend/routes/charsRoutes.js
/**
 * Chars Routes (MVCS)
 * - CREATE nutzt Raider.IO (Body: { name, realm, region? })
 */

const express = require("express");
const path = require("path");
const router = express.Router();

const ctrl = require("../controllers/charsController.js");
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

router.use(express.json());
router.use(attachUser);

/* Raider.IO */
router.get("/preview", requireAuth, ctrl.preview);
router.post("/import", requireAuth, ctrl.importOne);
router.post("/import/bulk", requireAuth, ctrl.importMany);

/* Reads */
router.get("/my", requireAuth, ctrl.listMine);
router.get("/me", requireAuth, ctrl.listMine);
router.get("/user/:discordId", requireAuth, ctrl.listByUser);
router.get("/:id", requireAuth, ctrl.getOne);

/* Writes */
// CREATE => Raider.IO-Import — keine manuellen Felder nötig
router.post("/", requireAuth, ctrl.create);
router.patch("/:id", requireAuth, ctrl.update);
router.delete("/:id", requireAuth, ctrl.remove);

module.exports = {
  basePath: "/chars",
  router,
};

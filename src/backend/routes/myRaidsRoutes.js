// src/backend/routes/myRaidsRoutes.js
const express = require("express");
const router = express.Router();

const { attachUser, requireAuth } = require("../middlewares/auth");
const ctrl = require("../controllers/myRaidsController");

// Auth-Context nur für API
router.use(attachUser);
router.use(requireAuth);

// /api/my-raids?scope=upcoming|all&cycle=current|next|all&onlyPicked=1
router.get("/", ctrl.listAll);
router.get("/upcoming", ctrl.listUpcoming);
router.get("/past", ctrl.listPast);

// ✅ Export so, wie dein server.js-Loader es erwartet
module.exports = { basePath: "/my-raids", router };

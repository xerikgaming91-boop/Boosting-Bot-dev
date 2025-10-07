// src/backend/controllers/usersController.js
const svcAuth = require("../services/authService.js");
const usersSvc = require("../services/usersService.js");

async function me(req, res) {
  await svcAuth.ensureFreshSession(req);
  return res.json({ ok: true, user: req.session?.user || null });
}

async function leads(_req, res, next) {
  try {
    const leads = await usersSvc.getLeads();
    return res.json({ ok: true, leads });
  } catch (err) {
    return next(err);
  }
}

module.exports = { me, leads };

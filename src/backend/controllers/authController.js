// src/backend/controllers/authController.js
const svc = require("../services/authService.js");

function sessionCookieName(req) {
  // express-session default
  return process.env.SESSION_NAME || (req?.session?.cookie?.name || "connect.sid");
}

async function start(req, res) {
  try {
    const url = svc.getAuthorizeUrl(req.query.state || "");
    return res.redirect(302, url);
  } catch (e) {
    console.error("[auth/start] error:", e);
    return res.status(500).send("oauth_start_failed");
  }
}

async function callback(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).send("missing_code");

  try {
    const user = await svc.loginWithCode(code);
    req.session.user = user;

    const wantsJson =
      (req.headers.accept || "").includes("application/json") || req.query.raw === "1";
    if (wantsJson) return res.json({ ok: true, user });

    return res.redirect(302, svc.FRONTEND_URL);
  } catch (e) {
    console.error("[auth/callback] error:", e);
    return res.status(500).send("oauth_failed");
  }
}

async function session(req, res) {
  await svc.ensureFreshSession(req);
  return res.json({ ok: true, user: req.session?.user || null });
}

function logout(req, res) {
  const name = sessionCookieName(req);
  req.session.destroy(() => {
    try {
      res.clearCookie(name);
    } catch (_) {}
    res.json({ ok: true });
  });
}

module.exports = { start, callback, session, logout };

// src/backend/controllers/authController.js
// CommonJS Controller für Discord OAuth

const svc = require("../services/authService.js");

async function start(req, res) {
  try {
    const url = svc.getAuthorizeUrl(req.query.state || "");
    // IMMER Redirect (302), damit der Browser nicht versucht zu cachen
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

    // JSON gewünscht?
    const wantsJson =
      (req.headers.accept || "").includes("application/json") || req.query.raw === "1";
    if (wantsJson) return res.json({ ok: true, user });

    // Redirect zurück ins Frontend
    return res.redirect(302, svc.FRONTEND_URL);
  } catch (e) {
    console.error("[auth/callback] error:", e);
    return res.status(500).send("oauth_failed");
  }
}

function session(req, res) {
  // No-Cache erfolgt schon im Router
  return res.json({ ok: true, user: req.session?.user || null });
}

function logout(req, res) {
  req.session.destroy(() => res.json({ ok: true }));
}

module.exports = { start, callback, session, logout };

// src/backend/controllers/authController.js
/**
 * Dünner Controller – delegiert alles an die Service-Schicht.
 */

const AuthService = require("../services/authService");

module.exports = {
  // GET /api/auth/discord/login
  discordLogin: AuthService.loginRedirect,

  // GET /api/auth/discord/callback?code=...
  discordCallback: AuthService.handleCallback,

  // GET /api/auth/session
  getSession: AuthService.getSession,

  // POST /api/auth/logout
  logout: AuthService.logout,
};

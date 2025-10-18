/* eslint-disable no-console */
"use strict";

require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const cors = require("cors");

/* ================== ENV / Helper ================== */
const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT || 4000);

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.DISCORD_REDIRECT_URI || process.env.OAUTH_REDIRECT_URI || "";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || "";

const ROLE_ID_OWNER =
  process.env.OWNER_ROLE_ID ||
  process.env.DISCORD_OWNER_ROLE_ID ||
  process.env.ROLE_OWNER_ID ||
  "";
const ROLE_ID_ADMIN =
  process.env.ADMIN_ROLE_ID ||
  process.env.DISCORD_ADMIN_ROLE_ID ||
  process.env.ROLE_ADMIN_ID ||
  "";
const ROLE_ID_RAIDLEAD =
  process.env.RAIDLEAD_ROLE_ID ||
  process.env.DISCORD_RAIDLEAD_ROLE_ID ||
  process.env.ROLE_RAIDLEAD_ID ||
  "";

// Callback-Pfad aus der Redirect-URL ableiten (z. B. "/api/auth/callback" oder "/auth/callback")
const CALLBACK_PATH = (() => {
  try {
    return new URL(REDIRECT_URI).pathname || "/auth/callback";
  } catch {
    return "/auth/callback";
  }
})();

// Node 18+: fetch global; Fallback für ältere Node-Versionen:
const fetchFn =
  typeof fetch === "function"
    ? fetch.bind(globalThis)
    : (...a) => import("node-fetch").then((m) => m.default(...a));

function buildDiscordLoginUrl() {
  if (!DISCORD_CLIENT_ID || !REDIRECT_URI) return null;
  const scope = (process.env.DISCORD_SCOPE || "identify guilds").trim().replace(/\s+/g, " ");
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope,
    prompt: process.env.DISCORD_PROMPT || "consent",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/** kleine Util: CSV/Leer → Set */
function toIdSet(v) {
  if (!v) return new Set();
  return new Set(
    String(v)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/** Guild Member Rollen via BOT-Token laden (liefert Array von Role IDs) */
async function fetchGuildMemberRoles(userId) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) return [];
  try {
    const resp = await fetchFn(
      `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${userId}`,
      { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.roles) ? data.roles : [];
  } catch {
    return [];
  }
}

/* ================== App Setup ================== */
const app = express();
app.disable("x-powered-by");
app.set("etag", false);

// Mini-Logger
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t0}ms)`);
  });
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // dev
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
    },
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Kein Cache für API
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

/* ================== /api immer JSON – mit Ausnahmen ================== */
/** Für diese /api-Pfade sind Redirects erlaubt (Login/Callback) */
const API_REDIRECT_WHITELIST = new Set(["/api/auth/login", "/api/auth/callback"]);

function apiJsonGuard(req, res, next) {
  if (!req.path || !req.path.startsWith("/api")) return next();

  // Content-Type defaulten
  if (!res.getHeader("content-type")) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
  }

  const allowRedirect = API_REDIRECT_WHITELIST.has(req.path);

  // Redirects in /api blocken – außer Whitelist
  const origRedirect = res.redirect.bind(res);
  res.redirect = function patchedRedirect(statusOrUrl, maybeUrl) {
    if (allowRedirect) {
      return origRedirect(statusOrUrl, maybeUrl);
    }
    let status = 302;
    let url = statusOrUrl;
    if (typeof statusOrUrl === "number") {
      status = statusOrUrl;
      url = maybeUrl;
    }
    const code = status === 302 ? 401 : status;
    return res.status(code).json({
      ok: false,
      error: code === 401 ? "unauthorized" : "redirect_blocked",
      redirect: url,
    });
  };

  // HTML-Send in /api blocken (nicht nötig bei Redirects)
  const origSend = res.send.bind(res);
  res.send = function patchedSend(body) {
    if (allowRedirect) {
      return origSend(body);
    }
    const ct = res.getHeader("content-type");
    if (!ct || String(ct).includes("text/html")) {
      try {
        if (body && typeof body === "object") {
          return res.type("application/json; charset=utf-8").json(body);
        }
        return res
          .status(res.statusCode && res.statusCode !== 200 ? res.statusCode : 500)
          .json({ ok: false, error: "non_json_response_blocked", preview: String(body).slice(0, 160) });
      } catch {
        return res.status(500).json({ ok: false, error: "non_json_response_blocked" });
      }
    }
    return origSend(body);
  };

  next();
}
app.use("/api", apiJsonGuard);

/* ================== Auth Endpoints ================== */
// 1) Login – direkt zu Discord
app.get("/api/auth/login", (_req, res) => {
  const url = buildDiscordLoginUrl();
  if (!url) return res.status(500).json({ ok: false, error: "oauth_not_configured" });
  return res.redirect(url);
});
app.get("/auth/login", (_req, res) => {
  const url = buildDiscordLoginUrl();
  if (!url) return res.status(500).send("OAuth not configured");
  return res.redirect(url);
});

// 2) Callback – Token tauschen, User + Rollen holen, Session setzen, zurück zur App
app.get(CALLBACK_PATH, async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return CALLBACK_PATH.startsWith("/api")
        ? res.status(400).json({ ok: false, error: "missing_code" })
        : res.status(400).send("missing_code");
    }
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !REDIRECT_URI) {
      return CALLBACK_PATH.startsWith("/api")
        ? res.status(500).json({ ok: false, error: "oauth_not_configured" })
        : res.status(500).send("oauth_not_configured");
    }

    // Token tauschen
    const tokenRes = await fetchFn("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token?.access_token) {
      const payload = { ok: false, error: "oauth_token_error", details: token };
      return CALLBACK_PATH.startsWith("/api") ? res.status(400).json(payload) : res.status(400).send("OAuth error");
    }

    // User laden (über User-Token)
    const meRes = await fetchFn("https://discord.com/api/users/@me", {
      headers: { Authorization: `${token.token_type} ${token.access_token}` },
    });
    const me = await meRes.json();
    if (!meRes.ok || !me?.id) {
      const payload = { ok: false, error: "oauth_user_error", details: me };
      return CALLBACK_PATH.startsWith("/api") ? res.status(400).json(payload) : res.status(400).send("OAuth error");
    }

    // Guild Rollen laden (über Bot-Token)
    const roleIds = await fetchGuildMemberRoles(me.id);
    const roleSet = new Set(roleIds);

    const isOwner = ROLE_ID_OWNER ? roleSet.has(ROLE_ID_OWNER) : false;
    const isAdmin = ROLE_ID_ADMIN ? roleSet.has(ROLE_ID_ADMIN) : false;
    const isRaidLead = ROLE_ID_RAIDLEAD ? roleSet.has(ROLE_ID_RAIDLEAD) : false;

    // Session setzen
    req.session.user = {
      id: me.id,
      username: me.username,
      global_name: me.global_name,
      discriminator: me.discriminator,
      avatar: me.avatar,
      roles: roleIds, // wichtig für Frontend-Guards
      flags: { isOwner, isAdmin, isRaidLead },
    };

    // zurück zur App
    return res.redirect("/");
  } catch (e) {
    console.error("OAuth callback error:", e);
    return CALLBACK_PATH.startsWith("/api")
      ? res.status(500).json({ ok: false, error: "oauth_callback_failed" })
      : res.status(500).send("oauth_callback_failed");
  }
});

// 3) SPA-Helfer: Status + Logout
app.get("/api/auth/me", (req, res) => {
  if (!req.session?.user) return res.status(401).json({ ok: false, error: "unauthorized" });
  return res.json({ ok: true, user: req.session.user });
});
app.post("/api/auth/logout", (req, res) => {
  try {
    req.session?.destroy?.(() => {});
  } catch {}
  return res.json({ ok: true });
});
app.get("/auth/logout", (req, res) => {
  try {
    req.session?.destroy?.(() => {});
  } catch {}
  return res.redirect("/");
});

/* ================== Router dynamisch mounten ================== */
function mountRouters() {
  const routesDir = path.join(__dirname, "routes");
  if (!fs.existsSync(routesDir)) {
    console.warn(`ℹ️  routes-Verzeichnis fehlt: ${routesDir}`);
    return;
  }
  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith("Routes.js"));
  for (const file of files) {
    const full = path.join(routesDir, file);
    try {
      const mod = require(full);
      const basePath =
        typeof mod.basePath === "string" && mod.basePath.startsWith("/") ? mod.basePath : null;
      const router = mod.router;
      if (!basePath || !router) {
        console.log(`ℹ️  Router ${file} hat keinen gültigen Export – übersprungen.`);
        continue;
      }
      app.use(`/api${basePath}`, router);
      console.log(`➡️  Mounted ${basePath.replace("/", "")} at /api${basePath}`);
    } catch (e) {
      console.error(`❌ Router-Load-Fehler für ${path.relative(process.cwd(), full)}:\n`, e);
    }
  }
}
mountRouters();

/* ================== Health / 404 ================== */
app.get("/api/health", (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV || "development" }));
app.all("/api/*", (req, res) => res.status(404).json({ ok: false, error: "not_found", path: req.originalUrl || req.url }));

/* ================== Frontend (Dev/Prod) + Bot ================== */
if (!isProd) {
  let viteExpress;
  try {
    viteExpress = require("vite-express");
  } catch {
    viteExpress = null;
  }
  if (viteExpress) {
    const frontendRoot = path.join(__dirname, "..", "frontend");
    console.log(`[info] Frontend root: ${frontendRoot}`);
    viteExpress.listen(app, PORT, () => {
      console.log(`✅ DEV-Server läuft auf http://localhost:${PORT}`);
      try {
        const discordBot = require("./discord-bot");
        discordBot.init();
      } catch (e) {
        console.warn("[discord-bot] init skipped:", e?.message || e);
      }
    });
  } else {
    app.listen(PORT, () => {
      console.log(`✅ (ohne Vite) Server läuft auf http://localhost:${PORT}`);
      try {
        const discordBot = require("./discord-bot");
        discordBot.init();
      } catch (e) {
        console.warn("[discord-bot] init skipped:", e?.message || e);
      }
    });
  }
} else {
  const distDir = path.join(__dirname, "..", "..", "dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
  }
  app.listen(PORT, () => {
    console.log(`✅ PROD-Server läuft auf http://localhost:${PORT}`);
    try {
      const discordBot = require("./discord-bot");
      discordBot.init();
    } catch (e) {
      console.warn("[discord-bot] init skipped:", e?.message || e);
    }
  });
}

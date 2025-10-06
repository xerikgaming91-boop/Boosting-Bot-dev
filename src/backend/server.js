/* eslint-disable no-console */
require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");

const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT || 4000);
const HMR_PORT = PORT + 1;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "sid";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret_change_me";

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: SESSION_COOKIE_NAME,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV || "development" })
);

// ----- Routen automatisch mounten -----
const routesDir = path.join(__dirname, "routes");
function loadRoute(file) {
  if (!file.endsWith("Routes.js")) return;
  const full = path.join(routesDir, file);
  try {
    const mod = require(full);
    const basePath =
      (mod.basePath || "").toString().trim() ||
      `/${file.replace(/Routes\.js$/, "")}`;
    const router = mod.router;
    if (!router || typeof router !== "function") {
      console.warn(`ℹ️  Router ${file} hat keinen gültigen Export – übersprungen.`);
      return;
    }
    app.use("/api", router);
    app.use(`/api${basePath.startsWith("/") ? "" : "/"}${basePath}`, router);
    console.log(
      `➡️  Mounted ${basePath.replace(/^\//, "")} from ${path.relative(
        process.cwd(),
        full
      )} at /api and /api${basePath}`
    );
  } catch (err) {
    console.error(
      `❌ Router-Load-Fehler für ${path.relative(process.cwd(), full)}:\n`,
      err
    );
  }
}
try {
  fs.readdirSync(routesDir).forEach(loadRoute);
} catch (e) {
  console.warn("ℹ️  Konnte routes-Verzeichnis nicht lesen:", routesDir, e?.message);
}

// ----- Frontend (Dev via Vite, Prod statisch) -----
// WICHTIG: KEINE inlineViteConfig → Vite liest deine vite.config.mjs (mit Tailwind/PostCSS)!
if (!isProd) {
  try {
    const ViteExpress = require("vite-express");
    // Nur Modus setzen; keine Inline-Config, damit vite.config.mjs greift.
    ViteExpress.config({ mode: "development" });

    ViteExpress.listen(app, PORT, () => {
      console.log(`✅ DEV-Server läuft auf http://localhost:${PORT}`);
      console.log(`🔁 HMR-WS läuft auf ws://localhost:${HMR_PORT}`);
    });
  } catch (e) {
    console.error("❌ Konnte vite-express nicht laden:", e?.message);
    // Notfall: statisch aus src/frontend (ohne HMR)
    const FRONTEND_ROOT = path.join(__dirname, "..", "frontend");
    app.use(express.static(FRONTEND_ROOT));
    app.listen(PORT, () =>
      console.log(`✅ (ohne Vite) Server läuft auf http://localhost:${PORT}`)
    );
  }
} else {
  const distDir = path.join(process.cwd(), "dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distDir, "index.html"));
    });
  }
  app.listen(PORT, () =>
    console.log(`✅ PROD-Server läuft auf http://localhost:${PORT}`)
  );
}

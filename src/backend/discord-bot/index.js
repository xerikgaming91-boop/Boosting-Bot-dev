// src/backend/discord-bot/index.js
// Public API: init() + syncRaid()
const { getClient } = require("./core/client.js");
const { ensureHandlersOnce } = require("./modules/signups/interactions.js");
const { syncRaid } = require("./modules/raids/sync.js");

async function init() {
  const ctx = await getClient();
  if (ctx.inactive) return false;
  await ensureHandlersOnce(); // registriert Button-Handler (Signup/Cancel)
  return true;
}

module.exports = { init, syncRaid };

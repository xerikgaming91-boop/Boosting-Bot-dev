// src/backend/discord-bot/index.js
// Public API: init(), syncRaid(), postRoster()
const { getClient } = require("./core/client.js");
const { ensureHandlersOnce } = require("./modules/signups/interactions.js");
const { syncRaid } = require("./modules/raids/sync.js");
const { postRosterMessage } = require("./modules/raids/rosterPost.js");

async function init() {
  const ctx = await getClient();
  if (ctx.inactive) return false;
  await ensureHandlersOnce(); // registriert Button-Handler (Signup/Cancel)
  return true;
}

/**
 * Postet ein Roster (nur SAVED Picks) in den Raid-Channel.
 * @param {number|object} raidOrId
 * @param {{ pingRoleIds?: string[], pingUserIds?: string[] }} [options]
 */
async function postRoster(raidOrId, options = {}) {
  return postRosterMessage(raidOrId, options);
}

module.exports = { init, syncRaid, postRoster };

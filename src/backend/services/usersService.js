// src/backend/services/usersService.js
// Thin Service-Layer für User

const users = require("../models/userModel.js");

async function getLeads() {
  return users.findLeads();
}
async function upsertFromDiscord(payload) {
  return users.upsertFromDiscord(payload);
}
async function findByDiscordId(discordId) {
  return users.findByDiscordId(discordId);
}

module.exports = {
  getLeads,
  upsertFromDiscord,
  findByDiscordId,
};

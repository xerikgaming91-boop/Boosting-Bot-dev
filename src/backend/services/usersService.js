// src/backend/services/usersService.js
const users = require("../models/userModel.js");

async function getLeads() {
  return users.findLeads();
}

module.exports = { getLeads };

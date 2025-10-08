// src/backend/discord-bot/core/client.js
let _ctx = null;

async function getClient() {
  if (_ctx) return _ctx;

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn("[discord-bot] DISCORD_BOT_TOKEN fehlt – Bot inaktiv.");
    _ctx = { client: null, discord: null, inactive: true, ready: false };
    return _ctx;
  }

  const { Client, GatewayIntentBits, Partials } = await import("discord.js");

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  // ✅ Platzhalter-Kontext VOR dem Event-Handler setzen
  _ctx = { client, discord: null, inactive: false, ready: false };

  // v14: "ready" ist ok; v15: "clientReady" – wir unterstützen beides
  const onReady = () => {
    console.log(`[discord-bot] eingeloggt als ${client.user?.tag}`);
    _ctx.ready = true;
  };
  client.once("ready", onReady);
  client.once("clientReady", onReady); // zukunftssicher

  await client.login(token);

  // discord-Objekt nach Login nachladen
  _ctx.discord = await import("discord.js");
  return _ctx;
}

module.exports = { getClient };

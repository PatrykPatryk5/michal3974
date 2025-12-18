require('dotenv').config();
const TOKEN = process.env.TOKEN;

const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
} = require("discord.js");
const fs = require("fs");
const loadSlashCommands = require("./functions/settings/loadSlashCommands");
const logger = require("./functions/logger");

const client = new Client({
  intents: [
    // IntentsBitField.Flags.Guilds, // -special structure in discord.js that allows you to modify a bitfield, using functions like add() and remove()
    GatewayIntentBits.Guilds, // .GUILDS,//
    GatewayIntentBits.GuildMessages, // .GUILD_MESSAGES,
    GatewayIntentBits.GuildMembers, // .GUILD_MEMBERS, // privileged intent
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates, // .GUILD_VOICE_STATES,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.GuildModeration, // audit log
  ],
  partials: [
    Partials.Channel,
    Partials.Message, // dm
  ],
});

// Load Event files from events folder
const eventFiles = fs.readdirSync("./events/").filter(f => f.endsWith(".js"));

for (const file of eventFiles) {
  try {
    const event = require(`./events/${file}`);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  } catch (err) {
    logger.error(`Failed loading event file ./events/${file}:`, err.stack || err);
  }
}

client.queue = new Collection();
client.radio = new Collection();
client.fileQueue = new Collection();
client.interactions = new Collection();
// client.slashCommands = new Collection();
// client.contextMenus = new Collection();
client.buttons = new Collection();
client.config = new Collection();
client.inactivity = new Collection();
client.invites = new Collection();
client.modals = new Collection();

// Load interaction handlers and command data before logging in to avoid race with ready
// Await the loader so `events/ready` can safely register commands on ready
(async () => {
  try {
    await loadSlashCommands(client);
  } catch (err) {
    console.error("[ERROR] Failed loading interactions:", err.stack || err);
  }

  client
    .on("warn", console.warn)
    .on("error", console.error)
    .on("shardError", console.error);

  process
    .on("uncaughtException", err => {
      console.error("[FATAL] uncaughtException:", err.stack || err);
      // Optionally exit or notify
    })
    .on("uncaughtExceptionMonitor", err => console.error("[MONITOR]", err.stack || err))
    .on("unhandledRejection", reason => console.error("[UNHANDLED REJECTION]", reason));

  // login after loader finishes
  client.login(TOKEN);
})();


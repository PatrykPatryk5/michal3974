const { PermissionsBitField, Collection } = require("discord.js");
// const checkInactivity = require("../functions/time/checkInactivity");
// const updateStats = require("../functions/messages/updateStats");
const createAudioPlayers = require("../functions/music/createAudioPlayers");
const createDatabases = require("../functions/settings/createDatabases");
const loadConfig = require("../functions/settings/loadConfig");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
      const logger = require("../functions/logger");
      logger.info(`${client.user.username} is online on ${client.guilds.cache.size} servers!`);

    // updateStats(client);

    // Set initial presence
    try {
      updatePresence(client);
      // Set interval to update presence every 1 minute
      setInterval(() => updatePresence(client), 60_000);
    } catch (err) {
      logger.warn("Failed setting presence:", err.stack || err);
    }

    try {
      await Promise.resolve(createDatabases(client));
    } catch (err) {
      logger.error("createDatabases failed:", err.stack || err);
    }

    try {
      await Promise.resolve(createAudioPlayers(client));
    } catch (err) {
      logger.error("createAudioPlayers failed:", err.stack || err);
    }

    try {
      await loadConfig(client);
    } catch (err) {
      logger.error("loadConfig failed:", err.stack || err);
    }

    // Register application (/) commands from loaded interactions
    try {
      const slashCommands = [...client.interactions.values()]
        .map(cmd => cmd?.data)
        .filter(Boolean);

      if (slashCommands.length > 0) {
        await client.application.commands.set(slashCommands);
        logger.info(`Registered ${slashCommands.length} application (/) commands.`);
      } else {
        logger.info("No slash commands found to register.");
      }
    } catch (err) {
      logger.error("Failed registering application commands:", err.stack || err);
    }

    // invites
    client.guilds.cache.forEach(async guild => {
      const clientMember = guild.members.cache.get(client.user.id);

      if (!clientMember.permissions.has(PermissionsBitField.Flags.ManageGuild))
        return logger.warn(`no permissions to check invites in ${guild.name}`);

      try {
        const firstInvates = await guild.invites.fetch();

        client.invites.set(
          guild.id,
          new Collection(firstInvates.map(invite => [invite.code, invite.uses]))
        );
      } catch (err) {
        logger.error(`Failed fetching invites for ${guild.name}:`, err.stack || err);
      }
    });
    logger.debug("ready complete");
  },
};

function updatePresence(client) {
  const activities = [
    { name: "Gram w Twierdzę!" },
    { name: `Mój ping: ${client.ws.ping}ms` },
    { name: `Jestem na ${client.guilds.cache.size} serwerach!` },
    { name: `Pracuję bez przerwy: ${formatUptime(client.uptime)}` },
    { name: "Jak pogoda?" },
  ];

  const randomActivity =
    activities[Math.floor(Math.random() * activities.length)];

  client.user.setPresence({
    activities: [randomActivity],
  });
}

function formatUptime(uptime) {
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
}

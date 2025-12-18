const ServerQueue = require("../../models/ServerQueue");
const RadioQueue = require("../../models/RadioQueue");
const logger = require("../logger");

module.exports = async client => {
  try {
    client.guilds.cache.forEach(guild => {
      try {
        client.queue.set(guild.id, new ServerQueue());
      } catch (err) {
        logger.error(`Failed creating ServerQueue for ${guild.id}:`, err.stack || err);
      }
    });

    client.guilds.cache.forEach(guild => {
      try {
        client.radio.set(guild.id, new RadioQueue());
      } catch (err) {
        logger.error(`Failed creating RadioQueue for ${guild.id}:`, err.stack || err);
      }
    });
  } catch (err) {
    logger.error("createAudioPlayers unexpected error:", err.stack || err);
  }
};

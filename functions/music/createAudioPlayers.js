const ServerQueue = require("../../models/ServerQueue");
const RadioQueue = require("../../models/RadioQueue");
const logger = require("../logger");

module.exports = async client => {
  try {
    client.guilds.cache.forEach(guild => {
      try {
        client.queue.set(guild.id, new ServerQueue());
        client.radio.set(guild.id, new RadioQueue());
      } catch (err) {
        logger.error(
          `Failed creating queue state for guild ${guild.id}:`,
          err.stack || err
        );
      }
    });
  } catch (err) {
    logger.error("createAudioPlayers unexpected error:", err.stack || err);
  }
};

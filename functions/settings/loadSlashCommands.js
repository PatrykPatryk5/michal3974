const { glob } = require("glob");
const handleButtons = require("./handleButtons");
const logger = require("../logger");

module.exports = async client => {
  const commandFiles = await glob(`${process.cwd()}/interactions/**/**/*.js`);
  const commands = [];

  for (const file of commandFiles) {
    try {
      const command = require(file);

      if (!command?.data || !command?.execute) {
        logger.warn(
          `The command at ${file} is missing a required "data" or "execute" property. Skipping.`
        );
        continue;
      }

      client.interactions.set(command.data.name, command);
      commands.push(command.data);
    } catch (err) {
      console.error(`[ERROR] Failed loading command file ${file}:`, err.stack || err);
    }
  }

  try {
    await handleButtons(client);
  } catch (err) {
    logger.error("handleButtons failed:", err.stack || err);
  }

  return commands;
};

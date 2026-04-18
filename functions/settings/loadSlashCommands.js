const path = require("path");
const { glob } = require("glob");
const handleButtons = require("./handleButtons");
const logger = require("../logger");

async function loadInteractions(client) {
  const commandFiles = await glob("interactions/**/*.js", {
    cwd: process.cwd(),
    absolute: true,
    nodir: true,
    windowsPathsNoEscape: true,
  });
  const commands = [];

  for (const file of commandFiles.sort()) {
    const relativePath = path.relative(process.cwd(), file);

    try {
      const command = require(file);
      const commandName = command?.data?.name;

      if (!commandName || typeof command?.execute !== "function") {
        logger.warn(
          `Command ${relativePath} is missing "data.name" or "execute". Skipping.`
        );
        continue;
      }

      client.interactions.set(commandName, command);
      commands.push(command.data);
    } catch (err) {
      logger.error(
        `Failed loading command file ${relativePath}:`,
        err.stack || err
      );
    }
  }

  return commands;
}

async function loadModals(client) {
  const modalFiles = await glob("modals/*.js", {
    cwd: process.cwd(),
    absolute: true,
    nodir: true,
    windowsPathsNoEscape: true,
  });

  for (const file of modalFiles.sort()) {
    const relativePath = path.relative(process.cwd(), file);

    try {
      const modal = require(file);

      if (!modal?.name || typeof modal?.execute !== "function") {
        logger.warn(
          `Modal ${relativePath} is missing "name" or "execute". Skipping.`
        );
        continue;
      }

      client.modals.set(modal.name, modal);
    } catch (err) {
      logger.error(`Failed loading modal file ${relativePath}:`, err.stack || err);
    }
  }
}

module.exports = async client => {
  const commands = await loadInteractions(client);

  try {
    await handleButtons(client);
  } catch (err) {
    logger.error("handleButtons failed:", err.stack || err);
  }

  try {
    await loadModals(client);
  } catch (err) {
    logger.error("loadModals failed:", err.stack || err);
  }

  return commands;
};

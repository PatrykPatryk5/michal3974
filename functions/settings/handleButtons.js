const path = require("path");
const { glob } = require("glob");
const logger = require("../logger");

module.exports = async client => {
  try {
    const buttonFiles = await glob("buttons/*.js", {
      cwd: process.cwd(),
      absolute: true,
      nodir: true,
      windowsPathsNoEscape: true,
    });

    for (const file of buttonFiles.sort()) {
      const relativePath = path.relative(process.cwd(), file);

      try {
        const button = require(file);
        const buttonName = button?.data?.name;

        if (!buttonName || typeof button?.execute !== "function") {
          logger.warn(
            `Button ${relativePath} is missing "data.name" or "execute". Skipping.`
          );
          continue;
        }

        client.buttons.set(buttonName, button);
      } catch (err) {
        logger.error(`Failed loading button file ${relativePath}:`, err.stack || err);
      }
    }
  } catch (error) {
    logger.error(error.stack || error);
  }
};

const { glob } = require("glob");
const logger = require("../logger");

module.exports = async client => {
  try {
    // Grab all the command files from the buttons directory
    const buttonFiles = await glob(`${process.cwd()}/buttons/*.js`);
    // buttons
    for (const file of buttonFiles) {
      try {
        const button = require(file);

        if (!button?.data || !button?.execute) {
          logger.warn(
            `The button at ${file} is missing a required "data" or "execute" property. Skipping.`
          );
          continue;
        }

        client.buttons.set(button.data.name, button);
      } catch (err) {
        logger.error(`Failed loading button file ${file}:`, err.stack || err);
      }
    }
  } catch (error) {
    logger.error(error.stack || error);
  }
};

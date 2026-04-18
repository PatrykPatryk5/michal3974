const { Events } = require("discord.js");
const sendEmbed = require("../functions/messages/sendEmbed");

module.exports = {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction) {
    const { client, commandName, customId } = interaction;

    try {
      if (interaction.isChatInputCommand() || interaction.isUserContextMenuCommand()) {
        const command = client.interactions.get(commandName);

        if (!command)
          throw new Error(`Nie znaleziono komendy/interakcji: ${commandName}.`);

        await command.execute(interaction);
      } else if (interaction.isButton()) {
        const button = client.buttons.get(customId);

        if (!button) throw new Error(`Nie znaleziono przycisku: ${customId}.`);

        await button.execute(interaction);
      } else if (interaction.isModalSubmit()) {
        const modal = client.modals.get(customId);
        if (!modal) throw new Error(`Nie znaleziono modala: ${customId}.`);

        await modal.execute(interaction);
      }
    } catch (error) {
      console.error(error);
      const description = error?.message || "Wystąpił nieoczekiwany błąd.";

      if (interaction.replied || interaction.deferred) {
        await sendEmbed(interaction, {
          description,
          ephemeral: true,
          followUp: true,
        });
      } else {
        await sendEmbed(interaction, { description, ephemeral: true });
      }
    }
  },
};

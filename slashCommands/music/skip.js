const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Pomija jedną piosenkę"),
  async execute(interaction) {
    const serverQueue = interaction.client.queue.get(interaction.guild.id);
    serverQueue.player.stop();
    await interaction.reply("Dalej!");
  },
};
 
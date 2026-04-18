const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const createVoiceConnection = require("../../../functions/music/createVoiceConnection");
const getResource = require("../../../functions/music/getResource");
const sendEmbed = require("../../../functions/messages/sendEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play_duzo")
    .setDescription("Dodaje utwor wiele razy do kolejki")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(option =>
      option
        .setName("muzyka")
        .setDescription("nazwa piosenki lub link yt")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("ile").setDescription("ile razy zagrac").setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const repeats = interaction.options.getInteger("ile");
      const song = interaction.options.getString("muzyka");

      if (repeats < 1 || repeats > 20) {
        throw new Error("Parametr 'ile' musi byc w zakresie 1-20.");
      }

      const voiceConnection = createVoiceConnection(interaction);
      const serverQueue = interaction.client.queue.get(interaction.guild.id);
      serverQueue.channel = interaction.channel;

      for (let i = 0; i < repeats; i++) {
        const resources = await getResource(song);
        serverQueue.queue.push(...resources);
      }

      voiceConnection.subscribe(serverQueue.player);
      if (!serverQueue.isPlaying) {
        serverQueue.play();
      }

      const firstTrack = serverQueue.queue[0]?.metadata;
      await sendEmbed(interaction, {
        description: `Dodano: **${firstTrack?.title || song}** x${repeats}\nW kolejce: ${serverQueue.queue.length}`,
      });
    } catch (error) {
      await sendEmbed(interaction, {
        description: error.message,
        color: "red",
        ephemeral: true,
        followUp: interaction.deferred || interaction.replied,
      });
    }
  },
};

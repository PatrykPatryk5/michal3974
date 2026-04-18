const { SlashCommandBuilder } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const sendEmbed = require("../../../functions/messages/sendEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("radio")
    .setDescription("Odtwarzanie radia FM")
    .addSubcommand(subcommand =>
      subcommand.setName("play").setDescription("Odpal radio")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("stop").setDescription("Wylacz radio")
    ),

  async execute(interaction) {
    const subCommand = interaction.options.getSubcommand();

    switch (subCommand) {
      case "play":
        await playRadio(interaction);
        break;
      case "stop":
        await stopRadio(interaction);
        break;
      default:
        await interaction.reply({
          content: "Nieznane polecenie.",
          ephemeral: true,
        });
    }
  },
};

async function playRadio(interaction) {
  const voiceChannelId = interaction.member?.voice?.channelId;
  if (!voiceChannelId) {
    return interaction.reply({
      content: "Dolacz do kanalu glosowego, aby odtworzyc radio.",
      ephemeral: true,
    });
  }

  const radioQueue = interaction.client.radio.get(interaction.guild.id);
  if (!radioQueue) {
    return interaction.reply({
      content: "Nie udalo sie zainicjalizowac kolejki radia.",
      ephemeral: true,
    });
  }

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannelId,
      guildId: interaction.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    if (!radioQueue.isPlaying) {
      radioQueue.player.play(radioQueue.createResource(0));
      radioQueue.isPlaying = true;
    }

    radioQueue.player.unpause();
    connection.subscribe(radioQueue.player);

    await interaction.reply("Odtwarzam radio.");
  } catch (error) {
    await sendEmbed(interaction, {
      description: `Nie udalo sie odtworzyc radia: ${error.message}`,
      color: "red",
      ephemeral: true,
    });
  }
}

async function stopRadio(interaction) {
  const radioQueue = interaction.client.radio.get(interaction.guild.id);

  if (!radioQueue) {
    return interaction.reply({
      content: "Kolejka radia nie istnieje na tym serwerze.",
      ephemeral: true,
    });
  }

  if (radioQueue.isPlaying) {
    radioQueue.player.pause();
    radioQueue.isPlaying = false;
  }

  return interaction.reply("Wylaczam radio.");
}

const sendEmbed = require("../functions/messages/sendEmbed");

module.exports = {
  name: "superTimeout",

  async execute(interaction) {
    const { fields } = interaction;
    const confirm = fields.getTextInputValue("confirm");
    const reason = fields.getTextInputValue("reason");

    const [, targetId] = String(interaction.customId || "").split(":");
    if (!targetId) {
      return sendEmbed(interaction, {
        description:
          "Nie mozna wykonac tej akcji: modal nie zawiera identyfikatora uzytkownika.",
        color: "red",
        ephemeral: true,
      });
    }

    const member = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!member) {
      return sendEmbed(interaction, {
        description: "Nie znaleziono uzytkownika do nalozenia przerwy.",
        color: "red",
        ephemeral: true,
      });
    }

    if (confirm.toLowerCase() !== "tak") {
      return sendEmbed(interaction, {
        description: `${member} nie dostal przerwy.`,
      });
    }

    await member.timeout(28 * 24 * 60 * 60 * 1000, reason || "Brak powodu");
    return sendEmbed(interaction, {
      description: `# ${member} dostal elegancka przerwe na 28 dni.`,
    });
  },
};

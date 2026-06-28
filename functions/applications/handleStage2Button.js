const betterSqlite3 = require("better-sqlite3");
const path = require("path");
const logger = require("../logger");
const updateStats = require("./updateStats");

module.exports = async (interaction, client) => {
  const targetGuildId = "1315972381285548123";
  const { customId, user } = interaction;

  // Expected ID: tak_stage2_123 or nie_stage2_123
  const isYes = customId.startsWith("tak_");
  const appId = customId.split("_")[2];

  const dbPath = path.join(process.cwd(), `db/db_${targetGuildId}.db`);
  const db = new betterSqlite3(dbPath);

  const application = db.prepare("SELECT * FROM applications WHERE id = ?").get(appId);

  if (!application) {
    db.close();
    return interaction.reply({ content: "Nie znaleziono tego podania.", ephemeral: true });
  }

  if (application.status !== 'PENDING_STAGE_2') {
    db.close();
    return interaction.reply({ content: "To podanie nie jest już w 2 etapie (zostało rozpatrzone).", ephemeral: true });
  }

  // Sprawdzamy czy dany uzytkownik juz glosowal w stage 2
  let voters = [];
  try {
    voters = JSON.parse(application.stage2_voters || '[]');
  } catch(e) {}

  if (voters.includes(user.id)) {
    db.close();
    return interaction.reply({ content: "Już oddałeś głos w sprawie tego podania.", ephemeral: true });
  }

  voters.push(user.id);
  const newYes = application.stage2_votes_yes + (isYes ? 1 : 0);
  const newNo = application.stage2_votes_no + (!isYes ? 1 : 0);

  db.prepare("UPDATE applications SET stage2_votes_yes = ?, stage2_votes_no = ?, stage2_voters = ? WHERE id = ?").run(
    newYes,
    newNo,
    JSON.stringify(voters),
    application.id
  );

  await interaction.reply({ content: `Oddano głos na **${isYes ? "TAK" : "NIE"}**. Dziękujemy!`, ephemeral: true });

  // Update button states on original message to disabled? We can't easily edit DM messages of others, but we can edit the one that triggered this interaction.
  try {
    await interaction.message.edit({ components: [] }); // Remove buttons for this user
  } catch (e) {}

  // Check if all admins have voted
  const totalAdmins = application.stage2_total_admins || 0;
  const totalVotes = newYes + newNo;

  if (totalAdmins > 0 && totalVotes >= totalAdmins) {
    // Wszyscy zagłosowali
    const yesPercentage = newYes / totalVotes;
    
    const { EmbedBuilder } = require("discord.js");
    let finalStatus = 'REJECTED';
    let resultEmbed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("Status Podania: Odrzucone")
      .setDescription("Niestety, po dokładnej analizie Twoje podanie zostało odrzucone w drugim etapie rekrutacji.");
    
    if (yesPercentage >= 0.51) {
      finalStatus = 'ACCEPTED';
      resultEmbed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("Status Podania: ZAAKCEPTOWANE! 🎉")
        .setDescription("Gratulacje! Twoje podanie zostało w pełni **zaakceptowane**! Pomyślnie przeszedłeś rekrutację. Wkrótce zostaniesz zaproszony na rozmowę z administracją.");
    }

    db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(finalStatus, application.id);
    db.close();

    await updateStats(client, targetGuildId);

    try {
      const applicant = await client.users.fetch(application.user_id);
      if (applicant) {
        await applicant.send({ embeds: [resultEmbed] });
      }
    } catch (e) {
      logger.warn("Could not DM applicant about final decision.");
    }
  } else {
    db.close();
  }
};

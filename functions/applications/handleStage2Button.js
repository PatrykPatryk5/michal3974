const betterSqlite3 = require("better-sqlite3");
const path = require("path");
const logger = require("../logger");
const updateStats = require("./updateStats");

module.exports = async (interaction, client) => {
  const targetGuildId = "1315972381285548123";
  const { customId, user } = interaction;
  
  const stage2Roles = [
    "1315972381411639372",
    "1315972381411639366"
  ];

  // Oczekiwane ID: tak_stage2_123 lub nie_stage2_123
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

  // Wczytanie głosów z 2 etapu jako słownik { "userId": true / false }
  let voters = {};
  try {
    const parsed = JSON.parse(application.stage2_voters || '{}');
    if (Array.isArray(parsed)) {
      voters = {}; // Migracja
    } else {
      voters = parsed;
    }
  } catch(e) {}

  if (voters[user.id] !== undefined && voters[user.id] === isYes) {
    db.close();
    return interaction.reply({ content: "Już oddałeś dokładnie taki sam głos.", ephemeral: true });
  }

  voters[user.id] = isYes;

  const guild = client.guilds.cache.get(targetGuildId);
  if (!guild) {
    db.close();
    return interaction.reply({ content: "Błąd serwera. Spróbuj ponownie.", ephemeral: true });
  }

  try {
    await guild.members.fetch();
  } catch (e) {}

  const stage2Admins = guild.members.cache.filter(m => !m.user.bot && m.roles.cache.some(r => stage2Roles.includes(r.id)));
  const totalAdmins = stage2Admins.size;

  let validYes = 0;
  let validNo = 0;

  for (const [voterId, vote] of Object.entries(voters)) {
    if (stage2Admins.has(voterId)) {
      if (vote === true) validYes++;
      else if (vote === false) validNo++;
    } else {
      delete voters[voterId];
    }
  }

  db.prepare("UPDATE applications SET stage2_votes_yes = ?, stage2_votes_no = ?, stage2_voters = ?, stage2_total_admins = ? WHERE id = ?").run(
    validYes,
    validNo,
    JSON.stringify(voters),
    totalAdmins,
    application.id
  );

  await interaction.reply({ content: `Zapisano głos na **${isYes ? "TAK" : "NIE"}**. Dziękujemy!`, ephemeral: true });

  const totalVotes = validYes + validNo;

  if (totalAdmins > 0 && totalVotes >= totalAdmins) {
    // Wszyscy obecni i uprawnieni zagłosowali
    const yesPercentage = validYes / totalVotes;
    
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

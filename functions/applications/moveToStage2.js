const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const logger = require("../logger");

module.exports = async (application, originalMessage, client) => {
  const stage2Roles = [
    "1315972381411639372",
    "1315972381411639366"
  ];

  const guild = originalMessage.guild;
  if (!guild) return;

  try {
    await guild.members.fetch();
  } catch(e) {}

  let applicantUser = null;
  try {
    applicantUser = await client.users.fetch(application.user_id);
  } catch(e) {}

  const stage2Admins = guild.members.cache.filter(m => !m.user.bot && m.roles.cache.some(r => stage2Roles.includes(r.id)));

  const embed = new EmbedBuilder()
    .setColor("#f1c40f")
    .setTitle(`📝 Podanie przeszło do Etapu 2 (ID: ${application.id})`)
    .setDescription(`**Treść podania:**\n\n${application.content}`);
    
  if (applicantUser) {
    embed.setAuthor({ name: `Aplikant: ${applicantUser.tag}`, iconURL: applicantUser.displayAvatarURL() });
  } else {
    embed.setAuthor({ name: `Aplikant ID: ${application.user_id}` });
  }

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`tak_stage2_${application.id}`)
        .setLabel("ZAAKCEPTUJ")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`nie_stage2_${application.id}`)
        .setLabel("ODRZUĆ")
        .setStyle(ButtonStyle.Danger)
    );

  let successfullySent = 0;
  for (const [adminId, adminMember] of stage2Admins) {
    try {
      await adminMember.send({ embeds: [embed], components: [row] });
      successfullySent++;
    } catch (e) {
      logger.warn(`Could not send stage 2 DM to admin ${adminMember.user.tag}`);
    }
  }

  const betterSqlite3 = require("better-sqlite3");
  const path = require("path");
  const updateStats = require("./updateStats");
  const dbPath = path.join(process.cwd(), `db/db_${guild.id}.db`);
  const db = new betterSqlite3(dbPath);

  if (successfullySent === 0) {
    // No admins received the DM, auto-reject to prevent getting stuck
    db.prepare("UPDATE applications SET status = 'REJECTED' WHERE id = ?").run(application.id);
    db.close();
    await updateStats(client, guild.id);
    try {
      const applicant = await client.users.fetch(application.user_id);
      if (applicant) {
        await applicant.send("❌ Niestety, proces rekrutacyjny napotkał błąd techniczny (brak możliwości kontaktu z administratorami Etapu 2) lub brak uprawnionych administratorów. Podanie zostało odrzucone.");
      }
    } catch (e) {
      logger.warn("Could not DM applicant about auto-rejection");
    }
    return;
  }

  db.prepare("UPDATE applications SET stage2_total_admins = ? WHERE id = ?").run(successfullySent, application.id);
  db.close();

  // Poinformowanie aplikanta
  try {
    const applicant = await client.users.fetch(application.user_id);
    if (applicant) {
      await applicant.send("🎉 Twoje podanie przeszło pozytywnie **pierwszy etap** rekrutacji! Rozpoczyna się drugi etap. Wkrótce otrzymasz kolejną wiadomość.");
    }
  } catch (e) {
    logger.warn("Could not DM applicant about stage 2");
  }
};

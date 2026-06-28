const betterSqlite3 = require("better-sqlite3");
const path = require("path");
const logger = require("../logger");
const updateStats = require("./updateStats");
const moveToStage2 = require("./moveToStage2");

module.exports = async (reaction, user, client) => {
  const targetChannelId = "1369740446674456576";
  const targetGuildId = "1315972381285548123";
  
  if (reaction.message.channel.id !== targetChannelId) return;

  const validRoles = [
    "1315972381411639372",
    "1315972381411639366",
    "1315972381411639370",
    "1315972381411639369"
  ];

  const guild = reaction.message.guild;
  if (!guild) return;

  let member;
  try {
    member = await guild.members.fetch(user.id);
  } catch (err) {
    return;
  }

  const hasRole = member.roles.cache.some(role => validRoles.includes(role.id));

  // If user doesn't have permissions, remove reaction
  if (!hasRole) {
    try {
      await reaction.users.remove(user.id);
    } catch (e) {
      // ignore
    }
    return;
  }

  const emoji = reaction.emoji.name;
  if (emoji !== "✅" && emoji !== "❌") {
    try {
      await reaction.users.remove(user.id);
    } catch(e) {}
    return;
  }

  const dbPath = path.join(process.cwd(), `db/db_${targetGuildId}.db`);
  const db = new betterSqlite3(dbPath);

  const application = db.prepare("SELECT * FROM applications WHERE message_id = ?").get(reaction.message.id);
  if (!application) {
    db.close();
    return;
  }

  if (application.status !== 'PENDING_STAGE_1') {
    db.close();
    return;
  }

  let voters = [];
  try {
    voters = JSON.parse(application.stage1_voters || '[]');
  } catch(e) {}

  if (voters.includes(user.id)) {
    // User already voted, ignore subsequent reactions.
    try {
      await reaction.users.remove(user.id);
    } catch(e) {}
    db.close();
    return;
  }

  // Record the vote
  voters.push(user.id);
  const isYes = emoji === "✅";
  const newYes = application.stage1_votes_yes + (isYes ? 1 : 0);
  const newNo = application.stage1_votes_no + (!isYes ? 1 : 0);

  db.prepare("UPDATE applications SET stage1_votes_yes = ?, stage1_votes_no = ?, stage1_voters = ? WHERE id = ?").run(
    newYes,
    newNo,
    JSON.stringify(voters),
    application.id
  );

  // Check if we reached >50% total votes
  try {
    await guild.members.fetch();
  } catch (e) {}

  const eligibleMembers = guild.members.cache.filter(m => !m.user.bot && m.roles.cache.some(r => validRoles.includes(r.id)));
  const totalEligible = eligibleMembers.size;
  const totalVotes = newYes + newNo;

  if (totalEligible > 0 && totalVotes > totalEligible / 2) {
    // Stage 1 finished!
    const yesPercentage = newYes / totalVotes;

    if (yesPercentage >= 0.51) {
      // Try atomic transition
      const res = db.prepare("UPDATE applications SET status = 'PENDING_STAGE_2' WHERE id = ? AND status = 'PENDING_STAGE_1'").run(application.id);
      db.close();
      
      if (res.changes > 0) {
        // Clear reactions so people can't keep clicking
        try { await reaction.message.reactions.removeAll(); } catch(e) {}
        try { await reaction.message.reply("✅ To podanie pomyślnie przeszło do **Etapu 2** i zostało przekazane administracji."); } catch(e) {}
        
        await updateStats(client, targetGuildId);
        await moveToStage2(application, reaction.message, client);
      }
    } else {
      // Reject
      const res = db.prepare("UPDATE applications SET status = 'REJECTED' WHERE id = ? AND status = 'PENDING_STAGE_1'").run(application.id);
      db.close();

      if (res.changes > 0) {
        try { await reaction.message.reactions.removeAll(); } catch(e) {}
        try { await reaction.message.reply("❌ To podanie zostało odrzucone w pierwszym etapie głosowania."); } catch(e) {}

        await updateStats(client, targetGuildId);
        try {
          const applicant = await client.users.fetch(application.user_id);
          if (applicant) {
            const { EmbedBuilder } = require("discord.js");
            const rejectEmbed = new EmbedBuilder()
              .setColor("#e74c3c")
              .setTitle("Status Podania: Odrzucone")
              .setDescription("Niestety, Twoje podanie zostało odrzucone na pierwszym etapie rekrutacji ze względu na niewystarczającą liczbę pozytywnych ocen.");
            await applicant.send({ embeds: [rejectEmbed] });
          }
        } catch (e) {
          logger.warn("Could not DM applicant after stage 1 rejection.");
        }
      }
    }
  } else {
    db.close();
  }
};

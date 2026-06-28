const betterSqlite3 = require("better-sqlite3");
const path = require("path");
const logger = require("../logger");
const updateStats = require("./updateStats");
const moveToStage2 = require("./moveToStage2");

module.exports = async (reaction, user, client, isAdd = true) => {
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

  // Jeśli użytkownik nie ma uprawnień
  if (!hasRole) {
    if (isAdd) {
      try {
        await reaction.users.remove(user.id);
      } catch (e) {}
    }
    return;
  }

  const emoji = reaction.emoji.name;
  if (emoji !== "✅" && emoji !== "❌") {
    if (isAdd) {
      try {
        await reaction.users.remove(user.id);
      } catch(e) {}
    }
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

  // Wczytanie głosów jako słownik { "userId": true (✅) / false (❌) }
  let voters = {};
  try {
    const parsed = JSON.parse(application.stage1_voters || '{}');
    if (Array.isArray(parsed)) {
      voters = {}; // Migracja starego formatu - resetujemy w locie
    } else {
      voters = parsed;
    }
  } catch(e) {}

  const isYes = emoji === "✅";

  if (isAdd) {
    // Jeśli dodaje głos
    voters[user.id] = isYes;
    
    // Wizualne usunięcie przeciwnej reakcji, żeby nie miał dwóch na raz
    try {
      const oppositeEmoji = isYes ? "❌" : "✅";
      const oppositeReaction = reaction.message.reactions.resolve(oppositeEmoji);
      if (oppositeReaction) {
        // Jeśli użytkownik ma tam reakcję, usuń ją (tylko z widoku, bo event MessageReactionRemove
        // i tak się odpali, ale obsłuży to prawidłowo dzięki weryfikacji poniżej)
        const hasOpposite = oppositeReaction.users.cache.has(user.id);
        if (hasOpposite) {
            await oppositeReaction.users.remove(user.id);
        }
      }
    } catch(e) {}

  } else {
    // Jeśli cofa głos
    // Sprawdzamy czy wycofana reakcja zgadza się z jego aktualnym głosem.
    // Dzięki temu, jeśli bot sam mu usunął starą reakcję przy zmianie zdania, nie usuniemy mu jego nowego głosu!
    if (voters[user.id] === isYes) {
      delete voters[user.id];
    } else {
      // Usunął inną reakcję niż jego aktualny głos, więc nic nie robimy w DB
      db.close();
      return;
    }
  }

  // Pobranie WSZYSTKICH aktualnych członków, żeby zweryfikować czy admini nadal mają role
  try {
    await guild.members.fetch();
  } catch (e) {}

  const eligibleMembers = guild.members.cache.filter(m => !m.user.bot && m.roles.cache.some(r => validRoles.includes(r.id)));
  const totalEligible = eligibleMembers.size;

  let validYes = 0;
  let validNo = 0;

  // Przeliczamy na nowo TYLKO uprawnionych adminów
  for (const [voterId, vote] of Object.entries(voters)) {
    if (eligibleMembers.has(voterId)) {
      if (vote === true) validYes++;
      else if (vote === false) validNo++;
    } else {
      // Możemy tu opcjonalnie wyczyścić głosy byłych adminów
      delete voters[voterId];
    }
  }

  // Zapisz zaktualizowany stan do DB
  db.prepare("UPDATE applications SET stage1_votes_yes = ?, stage1_votes_no = ?, stage1_voters = ? WHERE id = ?").run(
    validYes,
    validNo,
    JSON.stringify(voters),
    application.id
  );

  const totalVotes = validYes + validNo;

  if (totalEligible > 0 && totalVotes > totalEligible / 2) {
    // Etap 1 zakończony!
    const yesPercentage = validYes / totalVotes;

    if (yesPercentage >= 0.51) {
      const res = db.prepare("UPDATE applications SET status = 'PENDING_STAGE_2' WHERE id = ? AND status = 'PENDING_STAGE_1'").run(application.id);
      db.close();
      
      if (res.changes > 0) {
        try { await reaction.message.reactions.removeAll(); } catch(e) {}
        try { await reaction.message.reply("✅ To podanie pomyślnie przeszło do **Etapu 2** i zostało przekazane administracji."); } catch(e) {}
        
        await updateStats(client, targetGuildId);
        await moveToStage2(application, reaction.message, client);
      }
    } else {
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

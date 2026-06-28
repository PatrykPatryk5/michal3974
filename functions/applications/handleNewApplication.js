const betterSqlite3 = require("better-sqlite3");
const path = require("path");
const logger = require("../logger");
const updateStats = require("./updateStats");

module.exports = async (message, client) => {
  const targetChannelId = "1369740446674456576";
  const targetGuildId = "1315972381285548123";

  // Check if it's the right channel and not a bot
  if (message.channel.id !== targetChannelId || message.author.bot) return;

  // We are in the applications channel. We need to process the application.
  
  // 1. Check if the message contains numbers 1 to 8 (basic structure check)
  const content = message.content;
  // A better regex that checks if we have at least 6 distinct numbers followed by a dot or parenthesis, indicating a list.
  // We expect 8 questions. Let's ensure we find at least 1., 2., 3., 4., 5., 6., 7., 8. somewhere in the text.
  let foundNumbers = 0;
  for (let i = 1; i <= 8; i++) {
    if (new RegExp(`\\b${i}[.)]`, 'm').test(content)) {
      foundNumbers++;
    }
  }

  const isLongEnough = content.length > 50;
  const hasStructure = foundNumbers >= 6; // Require at least 6 out of 8 points to be somewhat forgiving

  if (!hasStructure || !isLongEnough) {
    // Bad structure
    try {
      await message.author.send("❌ Twoje podanie zostało odrzucone z powodu nieprawidłowej struktury. Upewnij się, że w jednej wiadomości odpowiadasz na wszystkie 8 pytań zachowując numerację (np. 1. Odpowiedź, 2. Odpowiedź).");
    } catch (e) {
      logger.warn(`Could not send DM to ${message.author.tag}`);
    }
    try {
      await message.delete();
    } catch (e) {
      logger.error("Could not delete badly structured application message.");
    }
    return;
  }

  // 2. Check 168h cooldown
  const dbPath = path.join(process.cwd(), `db/db_${targetGuildId}.db`);
  const db = new betterSqlite3(dbPath);

  const lastApp = db.prepare("SELECT created_at FROM applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(message.author.id);
  
  const now = Date.now();
  if (lastApp) {
    const timeDiff = now - lastApp.created_at;
    const cooldownMs = 168 * 60 * 60 * 1000;
    if (timeDiff < cooldownMs) {
      const remainingHours = Math.ceil((cooldownMs - timeDiff) / (1000 * 60 * 60));
      try {
        await message.delete();
        await message.author.send(`⏳ Nie możesz jeszcze złożyć podania. Pozostało: **${remainingHours} godzin** do końca cooldownu.`);
      } catch (e) {
        logger.warn(`Could not send DM to ${message.author.tag}`);
      }
      db.close();
      return;
    }
  }

  // 3. Valid application. Save to DB.
  try {
    const insertApp = db.prepare(`
      INSERT INTO applications (user_id, message_id, status, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertApp.run(message.author.id, message.id, 'PENDING_STAGE_1', message.content, now);

    // React with emojis for stage 1 voting
    try {
      await message.react("✅");
      await message.react("❌");
    } catch (e) {
      logger.error("Could not add reactions to new application:", e);
    }

    // Send DM
    try {
      const { EmbedBuilder } = require("discord.js");
      const embed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("📨 Podanie Złożone")
        .setDescription("Twoje podanie zostało pomyślnie złożone i zapisane w naszym systemie.\n\n**Obecny status:** 🕒 Oczekujące na sprawdzenie przez administrację.\n\nPoinformujemy Cię o kolejnych krokach w tej samej wiadomości prywatnej. Powodzenia!");
      await message.author.send({ embeds: [embed] });
    } catch (e) {
      logger.warn(`Could not send DM to ${message.author.tag}`);
    }

    logger.info(`[Podania] New application from ${message.author.tag} (${message.author.id})`);
    
    // Update stats
    await updateStats(client, targetGuildId);
  } catch (err) {
    logger.error("Error saving application:", err.stack || err);
  } finally {
    db.close();
  }
};

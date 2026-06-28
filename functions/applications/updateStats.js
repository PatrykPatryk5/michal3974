const betterSqlite3 = require("better-sqlite3");
const path = require("path");
const logger = require("../logger");

module.exports = async (client, guildId) => {
  try {
    const dbPath = path.join(process.cwd(), `db/db_${guildId}.db`);
    const db = new betterSqlite3(dbPath);

    // Pobierz message id i channel id statystyk
    const msgIdRow = db.prepare("SELECT value FROM applications_stats WHERE key = 'stats_message_id'").get();
    const channelIdRow = db.prepare("SELECT value FROM applications_stats WHERE key = 'stats_channel_id'").get();

    if (!msgIdRow || !channelIdRow) {
      db.close();
      return;
    }

    const statsMessageId = msgIdRow.value;
    const statsChannelId = channelIdRow.value;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return db.close();
    
    const channel = guild.channels.cache.get(statsChannelId);
    if (!channel) return db.close();

    const pending1 = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'PENDING_STAGE_1'").get().c;
    const pending2 = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'PENDING_STAGE_2'").get().c;
    const accepted = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'ACCEPTED'").get().c;
    const rejected = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'REJECTED'").get().c;

    db.close();

    try {
      const statsMessage = await channel.messages.fetch(statsMessageId);
      if (statsMessage) {
        const embed = statsMessage.embeds[0];
        if (!embed) return;

        const newEmbed = { ...embed.data };
        
        // Zaktualizuj statystyki
        if (newEmbed.fields && newEmbed.fields.length >= 3) {
            newEmbed.fields[2].value = 
                `• 🕒 Podania oczekujące: **${pending1}**\n` +
                `• 🧪 W trakcie drugiego etapu: **${pending2}**\n` +
                `• ✅ Zaakceptowane podania: **${accepted}**\n` +
                `• ❌ Odrzucone podania: **${rejected}**`;
        }

        const date = new Date();
        newEmbed.footer = { text: `Ostatnia aktualizacja: ${date.toLocaleDateString("pl-PL")} ${date.toLocaleTimeString("pl-PL")}` };

        await statsMessage.edit({ embeds: [newEmbed] });
      }
    } catch (err) {
      logger.error("Error updating stats message:", err.stack || err);
    }

  } catch (err) {
    logger.error("updateStats error:", err.stack || err);
  }
};

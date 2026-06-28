const { EmbedBuilder } = require("discord.js");
const betterSqlite3 = require("better-sqlite3");
const path = require("path");
const logger = require("../logger");

module.exports = async (client) => {
  const targetGuildId = "1315972381285548123";
  const targetChannelId = "1369740446674456576";

  try {
    const guild = client.guilds.cache.get(targetGuildId);
    if (!guild) return logger.warn(`[Podania] Guild ${targetGuildId} not found.`);

    const channel = guild.channels.cache.get(targetChannelId);
    if (!channel) return logger.warn(`[Podania] Channel ${targetChannelId} not found.`);

    const dbPath = path.join(process.cwd(), `db/db_${targetGuildId}.db`);
    const db = new betterSqlite3(dbPath);

    // Make sure tables exist (already in createDatabases, but to be safe)
    db.prepare("CREATE TABLE IF NOT EXISTS applications_stats (key TEXT PRIMARY KEY, value TEXT)").run();

    const msgIdRow = db.prepare("SELECT value FROM applications_stats WHERE key = 'stats_message_id'").get();
    
    let needsNewMessage = false;
    if (!msgIdRow) {
      needsNewMessage = true;
    } else {
      try {
        await channel.messages.fetch(msgIdRow.value);
      } catch (err) {
        // Message might have been deleted
        needsNewMessage = true;
      }
    }

    if (needsNewMessage) {
      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle("📨 System Podań o Administrację")
        .setDescription(
          "Witaj w systemie podań o administrację naszego serwera!\n\n" +
          "Jeśli chcesz dołączyć do zespołu administracyjnego i pomóc w rozwijaniu społeczności, przeczytaj dokładnie poniższe informacje i przygotuj **rzetelne oraz przemyślane podanie**."
        )
        .addFields(
          {
            name: "📝 Jak napisać podanie?",
            value:
              "W jednej wiadomości odpowiedz na następujące pytania:\n" +
              "1. **Ile masz lat?**\n" +
              "2. **Dlaczego chcesz zostać administratorem?**\n" +
              "3. **Jakie masz doświadczenie w moderacji, administracji lub innych podobnych rolach?**\n" +
              "4. **Jakie są Twoje mocne strony i cechy charakteru, które przydadzą się w tej roli?**\n" +
              "5. **Jakie masz umiejętności techniczne (jeśli jakiekolwiek)?**\n" +
              "6. **Ile czasu możesz poświęcić dziennie lub tygodniowo na obowiązki administratora?**\n" +
              "7. **Czy byłeś kiedyś karany na tym lub innym serwerze? Jeśli tak, to za co?**\n" +
              "8. **Dlaczego powinniśmy wybrać właśnie Ciebie?**"
          },
          {
            name: "📌 Zasady składania podań:",
            value:
              "• Możesz złożyć tylko **jedno podanie co 168 godzin**\n" +
              "• **Nie edytuj wiadomości z podaniem** – jeżeli chcesz coś poprawić, poczekaj aż cooldown się zakończy i napisz nowe podanie\n" +
              "• **Podanie powinno być napisane starannie i z szacunkiem** – traktujemy Twoje zgłoszenie poważnie\n" +
              "• **Nie kopiuj cudzych podań** – każde zgłoszenie musi być unikalne\n" +
              "• **Zgłoszenia bez odpowiedzi na wszystkie pytania mogą zostać odrzucone bez rozpatrzenia**\n\n" +
              "Po przesłaniu podania, otrzymasz wiadomość prywatną z informacją o jego statusie (oczekujące, rozmowa, zaakceptowane lub odrzucone)."
          },
          {
            name: "📊 Statystyki systemu podań:",
            value:
              "• 🕒 Podania oczekujące: **0**\n" +
              "• 🧪 W trakcie drugiego etapu: **0**\n" +
              "• ✅ Zaakceptowane podania: **0**\n" +
              "• ❌ Odrzucone podania: **0**"
          }
        );

      const sentMsg = await channel.send({ embeds: [embed] });
      db.prepare("INSERT OR REPLACE INTO applications_stats (key, value) VALUES (?, ?)").run("stats_message_id", sentMsg.id);
      db.prepare("INSERT OR REPLACE INTO applications_stats (key, value) VALUES (?, ?)").run("stats_channel_id", targetChannelId);
      logger.info("[Podania] Created new stats embed.");
    }
    
    db.close();

    // Call updateStats immediately to refresh values
    const updateStats = require("./updateStats");
    await updateStats(client, targetGuildId);

  } catch (err) {
    logger.error("initSystem applications error:", err.stack || err);
  }
};

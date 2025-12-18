const betterSqlite3 = require("better-sqlite3");
const getConfig = require("./getConfig");
const path = require("path");
const logger = require("../logger");
const retry = require("../retry");

module.exports = async client => {
  try {
    const databases = client.guilds.cache.map(guild => ({
      db: new betterSqlite3(path.join(process.cwd(), `db/db_${guild.id}.db`)),
      id: guild.id,
    }));

    for (const db of databases) {
      try {
        db.db.pragma("journal_mode = WAL");
        const conf = await retry(() => getConfig(db.db), { retries: 3 });
        client.config.set(db.id, conf);
      } catch (err) {
        logger.error(`Failed loading config for guild ${db.id}:`, err.stack || err);
      } finally {
        try {
          db.db.close();
        } catch (err) {
          logger.warn(`Failed closing config DB for ${db.id}:`, err.stack || err);
        }
      }
    }
  } catch (err) {
    logger.error("loadConfig unexpected error:", err.stack || err);
  }
};
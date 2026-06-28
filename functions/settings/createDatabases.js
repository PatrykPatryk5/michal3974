const betterSqlite3 = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const logger = require("../logger");
const retry = require("../retry");

module.exports = async client => {
  try {
    const dbDir = path.join(process.cwd(), "db");
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    const databases = client.guilds.cache.map(
      guild => new betterSqlite3(`db/db_${guild.id}.db`)
    );

    const createInactivityTable =
      "CREATE TABLE IF NOT EXISTS inactivity  (user_id  TEXT PRIMARY KEY, inactivity_num INTEGER DEFAULT 0)";
    const createPlusTable =
      "CREATE TABLE IF NOT EXISTS plus        (user_id  TEXT PRIMARY KEY, plus_num INTEGER, reason TEXT DEFAULT '')";
    const createWarnTable =
      "CREATE TABLE IF NOT EXISTS warn        (user_id  TEXT PRIMARY KEY, warn_num INTEGER DEFAULT 1, reason TEXT DEFAULT '')";
    const createConfigTable =
      "CREATE TABLE IF NOT EXISTS config      (key      TEXT PRIMARY KEY, value TEXT)";
    const createTaskTable =
      "CREATE TABLE IF NOT EXISTS task        (id    INTEGER PRIMARY KEY, user_id TEXT, date TEXT, content TEXT, additional_info TEXT)";
    const createTimeoutTable =
      "CREATE TABLE IF NOT EXISTS timeout     (id    INTEGER PRIMARY KEY AUTOINCREMENT, target_id TEXT, executor_id TEXT, reason TEXT, duration TEXT, action TEXT, timestamp INTEGER)";
    const createApplicationsTable =
      "CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, message_id TEXT, status TEXT, content TEXT, stage1_votes_yes INTEGER DEFAULT 0, stage1_votes_no INTEGER DEFAULT 0, stage1_voters TEXT DEFAULT '[]', stage2_votes_yes INTEGER DEFAULT 0, stage2_votes_no INTEGER DEFAULT 0, stage2_voters TEXT DEFAULT '[]', created_at INTEGER)";
    const createApplicationsStatsTable =
      "CREATE TABLE IF NOT EXISTS applications_stats (key TEXT PRIMARY KEY, value TEXT)";

    for (const db of databases) {
      try {
        await retry(() => {
          db.pragma("journal_mode = WAL");
          db.prepare(createInactivityTable).run();
          db.prepare(createPlusTable).run();
          db.prepare(createWarnTable).run();
          db.prepare(createConfigTable).run();
          db.prepare(createTaskTable).run();
          db.prepare(createTimeoutTable).run();
          db.prepare(createApplicationsTable).run();
          db.prepare(createApplicationsStatsTable).run();
          
          try {
            db.prepare("ALTER TABLE applications ADD COLUMN stage2_total_admins INTEGER DEFAULT 0").run();
          } catch(e) {} // Ignore if column already exists

          return Promise.resolve();
        }, { retries: 3 });
      } catch (err) {
        logger.error(`Failed preparing DB for ${db.name || 'unknown'} after retries:`, err.stack || err);
      } finally {
        try {
          db.close();
        } catch (err) {
          logger.warn('Failed closing DB:', err.stack || err);
        }
      }
    }
  } catch (err) {
    logger.error("createDatabases unexpected error:", err.stack || err);
  }
};

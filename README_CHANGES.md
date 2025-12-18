Summary of automated refactor and fixes

What I changed:
- Added `functions/logger.js` — small centralized logger used across modules.
- Added `functions/retry.js` — exponential-backoff retry helper.
- Hardened loaders and startup flow:
  - `functions/settings/loadSlashCommands.js`: skip malformed commands, log errors, return command data.
  - `functions/settings/handleButtons.js`: resilient loading with logging.
  - `events/ready.js`: robust registration of application commands, presence handling, and invite fetch error handling; uses `logger`.
  - `index.js`: await interaction loaders before `client.login`, wrap event registration in try/catch, and improved process-level error logs.
  - `functions/settings/createDatabases.js`: ensure `db/` exists, per-guild DB setup with retry and error handling.
  - `functions/settings/loadConfig.js`: load per-guild config with retry and safe DB closing.
  - `functions/music/createAudioPlayers.js`: per-guild queue/radio creation with error handling.
- Added `scripts/smokeStart.js` — runs initialization flow without logging into Discord for local verification.

How to run quick smoke test locally:

1. Ensure dependencies are installed:

```bash
npm install
```

2. Run the smoke test (does not require a Discord token):

```bash
node scripts/smokeStart.js
```

3. To run the bot normally, set `TOKEN` in `.env` and run:

```bash
node index.js
```

Notes and next steps:
- I added retries for DB operations; we can expand retries to network calls.
- Consider adding a proper logging library (winston) and unit tests.

const path = require('path');
const logger = require('../functions/logger');
const loadSlashCommands = require('../functions/settings/loadSlashCommands');
const createDatabases = require('../functions/settings/createDatabases');
const loadConfig = require('../functions/settings/loadConfig');
const createAudioPlayers = require('../functions/music/createAudioPlayers');

(async () => {
  const client = {
    interactions: new Map(),
    buttons: new Map(),
    queue: new Map(),
    radio: new Map(),
    config: new Map(),
    invites: new Map(),
    modals: new Map(),
    guilds: {
      cache: {
        _arr: [{ id: '111111', name: 'Smoke Guild' }],
        map(fn) { return this._arr.map(fn); },
        forEach(fn) { return this._arr.forEach(fn); },
        get(id) { return this._arr.find(g => g.id === id); },
        get size() { return this._arr.length; }
      }
    }
  };

  logger.info('Starting smoke test');
  try { await loadSlashCommands(client); logger.info('loadSlashCommands OK'); } catch (e) { logger.error('loadSlashCommands failed', e.stack || e); }
  try { await createDatabases(client); logger.info('createDatabases OK'); } catch (e) { logger.error('createDatabases failed', e.stack || e); }
  try { await createAudioPlayers(client); logger.info('createAudioPlayers OK'); } catch (e) { logger.error('createAudioPlayers failed', e.stack || e); }
  try { await loadConfig(client); logger.info('loadConfig OK'); } catch (e) { logger.error('loadConfig failed', e.stack || e); }
  logger.info('Smoke test finished');
})();

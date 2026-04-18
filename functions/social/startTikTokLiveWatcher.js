const fs = require("fs");
const path = require("path");
const logger = require("../logger");
const sendEmbed = require("../messages/sendEmbed");
const checkTikTokLive = require("./checkTikTokLive");

const TIKTOK_USERNAME = process.env.TIKTOK_LIVE_USERNAME || "x_t_u_p_t_u_s_x";
const LIVE_CHANNEL_ID =
  process.env.TIKTOK_LIVE_CHANNEL_ID || "1495133629456847091";
const CHECK_INTERVAL_MS =
  Number(process.env.TIKTOK_LIVE_CHECK_INTERVAL_MS) || 10_000;
const STATE_FILE_PATH = path.join(process.cwd(), "db", "tiktok-live-state.json");

module.exports = client => {
  const savedState = readState();
  const state = {
    checking: false,
    isLive: false,
    lastNotifiedLiveKey: savedState.lastNotifiedLiveKey || null,
  };

  const runCheck = async () => {
    if (state.checking) return;
    state.checking = true;

    try {
      const { isLive, roomId, liveUrl } = await checkTikTokLive(TIKTOK_USERNAME);
      const currentLiveKey = roomId || null;
      const shouldNotify = shouldSendNotification({
        isLive,
        roomId: currentLiveKey,
        state,
      });

      if (shouldNotify) {
        await notifyLive(client, liveUrl);
        state.lastNotifiedLiveKey = currentLiveKey || `fallback:${Date.now()}`;
        writeState(state.lastNotifiedLiveKey);
      }

      state.isLive = isLive;
    } catch (error) {
      logger.warn(`TikTok live check failed: ${error.message}`);
    } finally {
      state.checking = false;
    }
  };

  runCheck();
  const interval = setInterval(runCheck, CHECK_INTERVAL_MS);
  if (typeof interval.unref === "function") interval.unref();

  logger.info(
    `TikTok watcher started for @${TIKTOK_USERNAME} (interval ${CHECK_INTERVAL_MS}ms).`
  );
};

function shouldSendNotification({ isLive, roomId, state }) {
  if (!isLive) return false;

  // Primary de-duplication key: TikTok room id (stable per live session).
  if (roomId) {
    return state.lastNotifiedLiveKey !== roomId;
  }

  // Fallback when room id is unavailable.
  return !state.isLive;
}

function readState() {
  try {
    const stateRaw = fs.readFileSync(STATE_FILE_PATH, "utf8");
    return JSON.parse(stateRaw);
  } catch (error) {
    return {};
  }
}

function writeState(lastNotifiedLiveKey) {
  try {
    const stateDir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    fs.writeFileSync(
      STATE_FILE_PATH,
      JSON.stringify({ lastNotifiedLiveKey }, null, 2),
      "utf8"
    );
  } catch (error) {
    logger.warn(`TikTok watcher: failed saving state file: ${error.message}`);
  }
}

async function notifyLive(client, liveUrl) {
  const channel = await client.channels.fetch(LIVE_CHANNEL_ID).catch(() => null);

  if (!channel) {
    logger.error(
      `TikTok watcher: cannot fetch channel ${LIVE_CHANNEL_ID} for live notification.`
    );
    return;
  }

  await sendEmbed(channel, {
    title: "TikTok LIVE",
    description: `@${TIKTOK_USERNAME} jest LIVE. Wbijac!\n${liveUrl}`,
    color: "tiktok",
  });
}

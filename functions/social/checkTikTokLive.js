const axios = require("axios");

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
};

module.exports = async username => {
  if (!username) throw new Error("TikTok username is required.");

  const liveUrl = `https://www.tiktok.com/@${username}/live`;
  const response = await axios.get(liveUrl, {
    headers: REQUEST_HEADERS,
    timeout: 8000,
    maxRedirects: 5,
    validateStatus: status => status >= 200 && status < 400,
    responseType: "text",
  });

  const html = String(response.data || "");
  const normalized = html.toLowerCase();
  const finalUrl = String(response.request?.res?.responseUrl || liveUrl).toLowerCase();

  const hasExplicitLiveFlag =
    normalized.includes('"islive":true') ||
    normalized.includes('"is_live":true') ||
    normalized.includes('"livestatus":1');
  const hasLiveRoomStatus =
    normalized.includes('"status":2') &&
    (normalized.includes("liveroom") ||
      normalized.includes("liveroomuserinfo") ||
      normalized.includes("webcast"));
  const redirectedAwayFromLivePage = !finalUrl.includes("/live");

  const isLive = (hasExplicitLiveFlag || hasLiveRoomStatus) && !redirectedAwayFromLivePage;
  const roomId = extractRoomId(normalized);

  return {
    isLive,
    roomId,
    liveUrl,
  };
};

function extractRoomId(normalizedHtml) {
  const roomIdMatch =
    normalizedHtml.match(/"roomid":"(\d+)"/) ||
    normalizedHtml.match(/"room_id":"(\d+)"/);

  return roomIdMatch?.[1] || null;
}

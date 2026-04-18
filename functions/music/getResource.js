const { createAudioResource } = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const { Attachment } = require("discord.js");
const { exec } = require("child_process");
const util = require("util");
const YouTube = require("youtube-sr").default;

const execPromise = util.promisify(exec);

module.exports = async song => {
  const tracks =
    song instanceof Attachment
      ? [await createAttachmentTrack(song)]
      : await resolveYouTubeTracks(song);

  const resources = await Promise.all(tracks.map(track => createTrackResource(track)));
  if (!resources.length) throw new Error("Nie znaleziono zadnego utworu.");
  return resources;
};

async function resolveYouTubeTracks(song) {
  if (typeof song !== "string" || !song.trim()) {
    throw new Error("Podaj nazwe utworu lub link YouTube.");
  }

  if (ytdl.validateURL(song)) {
    const playlist = await YouTube.getPlaylist(song).catch(() => null);
    if (playlist?.videos?.length) {
      return playlist.videos
        .map(video => ({
          url: `https://www.youtube.com/watch?v=${video.id}`,
          title: video.title,
          duration: video.durationFormatted || null,
        }))
        .filter(track => Boolean(track.url));
    }

    return [{ url: song }];
  }

  const video = await YouTube.searchOne(song, "video");
  if (!video?.url) throw new Error("Nie znaleziono zadnego filmu na YouTube.");

  return [
    {
      url: video.url,
      title: video.title,
      duration: video.durationFormatted || null,
    },
  ];
}

async function createTrackResource(track) {
  if (ytdl.validateURL(track.url)) {
    const videoInfo = await ytdl.getInfo(track.url);
    const stream = ytdl(track.url, { filter: "audioonly" });

    const resource = createAudioResource(stream);
    resource.metadata = {
      title: track.title || videoInfo.videoDetails.title,
      duration:
        track.duration || formatDurationSeconds(videoInfo.videoDetails.lengthSeconds),
      url: track.url,
    };
    return resource;
  }

  const resource = createAudioResource(track.url);
  resource.metadata = {
    title: track.title || track.url,
    duration: track.duration || "unknown",
    url: track.url,
  };
  return resource;
}

async function createAttachmentTrack(attachment) {
  const duration = await getDuration(attachment.url);

  return {
    url: attachment.url,
    title: attachment.name,
    duration: duration || "unknown",
  };
}

function formatDurationSeconds(seconds) {
  return new Date(Number(seconds) * 1000).toISOString().slice(11, 19);
}

async function getDuration(url) {
  const cmd =
    'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "' +
    url +
    '"';

  try {
    const { stdout } = await execPromise(cmd);
    return formatDurationSeconds(parseFloat(stdout));
  } catch (error) {
    return null;
  }
}

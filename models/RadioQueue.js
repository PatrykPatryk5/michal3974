const {
  AudioPlayerStatus,
  createAudioResource,
  createAudioPlayer,
} = require("@discordjs/voice");

class RadioQueue {
  constructor() {
    // Keep only source URLs at startup so bot can boot even without FFmpeg.
    this.queue = [
      "http://x.radiokaszebe.pl:9000/;?type=http&nocache=87",
      "http://radioniepokalanow.com.pl:7600/rn.mp3",
    ];
    this.isPlaying = false;
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Playing, () => {
      console.log("The radio player has started playing!");
    });
    this.player.on(AudioPlayerStatus.AutoPaused, () => {
      console.log("radio zapauzowane!");
    });
    this.player.on(AudioPlayerStatus.Buffering, () => {
      console.log("buforuje radio!");
    });
  }

  createResource(index = 0) {
    const streamUrl = this.queue[index];

    if (!streamUrl) {
      throw new Error("Brak zdefiniowanego streamu radiowego.");
    }

    return createAudioResource(streamUrl);
  }
}

module.exports = RadioQueue;

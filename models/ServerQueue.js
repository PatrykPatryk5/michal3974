const { AudioPlayerStatus, createAudioPlayer } = require("@discordjs/voice");
const getResource = require("../functions/music/getResource");
const sendEmbed = require("../functions/messages/sendEmbed");

class ServerQueue {
  constructor() {
    this.channel = null;
    this.queue = [];
    this.isPlaying = false;
    this.isLooping = false;
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Playing, () => {
      console.log("The music player has started playing!");
    });

    this.player.on(AudioPlayerStatus.AutoPaused, () => {
      console.log("muzyka zapauzowana!");
    });

    this.player.on(AudioPlayerStatus.Buffering, () => {
      console.log("buforuje muzyke!");
    });

    this.player.on(AudioPlayerStatus.Idle, async () => {
      const finishedTrack = this.queue.shift();
      const finishedUrl = finishedTrack?.metadata?.url;

      if (this.isLooping && finishedUrl) {
        try {
          const loopResources = await getResource(finishedUrl);
          this.queue.unshift(...loopResources);
        } catch (error) {
          console.error("Loop reload failed:", error.message);
        }
      }

      if (this.queue.length) {
        this.player.play(this.queue[0]);
      } else {
        this.isPlaying = false;
      }

      if (this.channel) {
        sendEmbed(this.channel, {
          description: `piosenki w kolejce: ${this.queue.length}`,
        });
      }
    });

    this.player.on("error", error => {
      console.error(`Audio player error: ${error.message}`);
      this.queue.shift();

      if (this.queue.length) {
        this.player.play(this.queue[0]);
      } else {
        this.isPlaying = false;
      }
    });
  }

  play() {
    if (!this.queue.length) {
      this.isPlaying = false;
      return;
    }

    this.player.play(this.queue[0]);
    this.isPlaying = true;
  }
}

module.exports = ServerQueue;

module.exports = {
  config: {
    name: "pause",
    description: "skip song",
    usage: `pause`,
  },

  /**
   * @param {Client} client
   * @param {Message} message
   * @param {String[]} args
   */

  run: async (client, message, args) => {
    client.distube.pause(message);
    message.channel.send(`halt 🎵`);
  },
};

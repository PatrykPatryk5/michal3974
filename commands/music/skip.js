module.exports = {
  config: {
    name: "skip",
    description: "skip song",
    usage: `skip`,
  },

  /**
   * @param {Client} client
   * @param {Message} message
   * @param {String[]} args
   */

  run: async (client, message, args) => {
    client.distube.skip(message);
    message.channel.send(`koniec 🎵`);
  },
};

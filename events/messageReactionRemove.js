const { Events } = require("discord.js");
const handleStage1Reaction = require("../functions/applications/handleStage1Reaction");

module.exports = {
  name: Events.MessageReactionRemove,
  once: false,
  async execute(reaction, user, client) {
    if (user.bot) return;
    
    // Partial handling if reaction is uncached
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Something went wrong when fetching the message:', error);
        return;
      }
    }

    try {
      await handleStage1Reaction(reaction, user, client, false);
    } catch (err) {
      console.error("handleStage1Reaction (remove) failed:", err);
    }
  }
};

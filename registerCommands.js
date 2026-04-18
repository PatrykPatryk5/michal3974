const path = require("path");
const { REST, Routes } = require("discord.js");
const { glob } = require("glob");

let CLIENT_ID;
let GUILD_ID;
let TOKEN;
try {
  const cfg = require("./config.json");
  CLIENT_ID = cfg.CLIENT_ID;
  GUILD_ID = cfg.GUILD_ID;
  TOKEN = cfg.TOKEN;
} catch (err) {
  CLIENT_ID = process.env.CLIENT_ID;
  GUILD_ID = process.env.GUILD_ID;
  TOKEN = process.env.TOKEN;
  if (!CLIENT_ID || !TOKEN) {
    console.error(
      "config.json not found and required environment variables are missing (CLIENT_ID, TOKEN)."
    );
    process.exit(1);
  }
}

// ##### CONFIG #####
// ### production ###
const registerGlobal = true;
const clearCommands = false;

// ###    test    ###
// const registerGlobal = false;
// const clearCommands = true;

// ##### PROGRAM #####
const commands = [];

// and deploy your commands!
(async () => {
  try {
    const commandFiles = await glob("interactions/**/*.js", {
      cwd: process.cwd(),
      absolute: true,
      nodir: true,
      windowsPathsNoEscape: true,
    });

    if (!clearCommands) {
      for (const file of commandFiles.sort()) {
        const command = require(file);

        if (!command?.data || typeof command?.execute !== "function") {
          console.warn(
            `[WARNING] Command ${path.relative(
              process.cwd(),
              file
            )} is missing "data" or "execute". Skipping.`
          );
          continue;
        }

        commands.push(command.data);
      }
    }

    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );
    console.log(commands.map(a => a.name).join(", "));
    
    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(TOKEN);

    const route = registerGlobal
      ? Routes.applicationCommands(CLIENT_ID)
      : Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);

    const data = await rest.put(route, { body: commands });
    
    // let data = [];

    // if (registerGlobal) {
    //   data = await rest.put(
    //     // global
    //     Routes.applicationCommands(CLIENT_ID),
    //     { body: commands }
    //   );
    // } else {
    //   // The put method is used to fully refresh all commands in the guild with the current set
    //   data = await rest.put(
    //     // JURA TWIERDZA
    //     Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    //     { body: commands }
    //   );
    // }

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();

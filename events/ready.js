const checkInactivity = require("../computings/checkInactivity");
const createAudioPlayers = require("../computings/createAudioPlayers");
const createDatabases = require("../computings/createDatabases");
const loadConfig = require("../computings/loadConfig");

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(
            `${client.user.username} is online on ${client.guilds.cache.size} servers!`
        );

        // Set initial presence
        updatePresence(client);

        // Set interval to update presence every 1 minute
        setInterval(() => {
            updatePresence(client);
        }, 60000); // 1 minute in milliseconds

        createDatabases(client);
        createAudioPlayers(client);
        await loadConfig(client);

        // Set up listener for private messages
        client.on('messageCreate', message => {
            if (message.channel.type === 'DM' && !message.author.bot) {
                // Respond to private messages
                message.reply("Niestety nie potrafię rozmawiać na pv, ale tu masz listę komend jakie możesz użyć na serwerze:\n" +
                    "KOMENDY: `/play`, `/skip`, `/pause`, `/unpause`, `/queue`, `/stop`, `/panel`, `/radio`, `/pętla`\n" +
                    "Ogólne: `/nb`\n" +
                    "Ostrzeżenia: `/poka_wszystkie_ostrzezenia`, `/poka_ostrzezenia`\n" +
                    "Plusy: `/poka_wszystkie_plusy`, `/poka_plusy`\n" +
                    "Dla adminów: `/ostrzezenie dodaj`, `/ostrzezenie usun`, `/ostrzezenie czysc`, `/config`, `/sprawdzaj_nieobecnosci`");
            }
        });
    }
}

function updatePresence(client) {
    const activities = [
        { name: "Gram w twierdzę!" },
        { name: `Mój ping: ${client.ws.ping}ms` },
        { name: `Jestem na ${client.guilds.cache.size} serwerach!` },
        { name: `Pracuję bez przerwy: ${formatUptime(client.uptime)}` },
        { name: "Jak pogoda?" },
    ];

    const randomActivity = activities[Math.floor(Math.random() * activities.length)];

    client.user.setPresence({
        activities: [randomActivity],
    });
}

function formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
}

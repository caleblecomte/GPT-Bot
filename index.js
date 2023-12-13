require('dotenv/config');
const { Client } = require('discord.js');
const { OpenAI } = require('openai');

const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

const IGNORE_PREFIXES = "!";
const CHANNELS = ['1176634461698396210'];

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI,
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIXES)) return;
    if (!CHANNELS.includes(message.channelId) && !message.users.has(client.user.id)) return;

    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    let conversation = [];
    conversation.push({
        role: 'system',
        content: 'You are a helpful assistant.',
    });

    let prevMessages = await message.channel.messages.fetch({ limit: 10 });
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user.id) return;
        if (msg.content.startsWith(IGNORE_PREFIXES)) return;

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

        if (msg.author.id === client.user.id) {
            conversation.push({
                role: 'assistant',
                name: username,
                content: msg.content,
            });

            return;
        }

        conversation.push({
            role: 'user',
            name: username,
            content: msg.content,
        });

    })

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: conversation,
    }).catch((error) => console.error('OpenAI Error: \n', error));

    clearInterval(sendTypingInterval);

    if (!response) {
        message.reply("I am having some trouble with the OpenAI API. Please try again later.");
        return;
    }

    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);

        await message.reply(chunk);
    }
});

client.login(process.env.TOKEN);
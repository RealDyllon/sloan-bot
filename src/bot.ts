import { Bot, Context, InlineKeyboard, session, SessionFlavor, webhookCallback } from 'grammy';
import {
    type Conversation,
    type ConversationFlavor,
    conversations,
    createConversation
} from '@grammyjs/conversations';
import express from 'express';

import { yoMiddleWare } from './commands/yo';

//////

interface SessionData {
    previousMessages: Array<
        { role: string; content: string, time: number }>;
    lastUserResponseTime: number;
}

export type MyContext = Context & SessionFlavor<SessionData>;

// Create a bot using the Telegram token
const bot = new Bot<MyContext>(process.env.TELEGRAM_TOKEN || '');

//////

function initial(): SessionData {
    return { lastUserResponseTime: 0, previousMessages: [] };
}

bot.use(session({ initial }));

bot.on("message", async (ctx) => {
    // store user input
    ctx.session.previousMessages.push({
        role: "user",
        content: ctx.message.text ?? "",
        time: ctx.message.date
    });

    // call api

    // save api response to session

    // reply
    await ctx.reply(`Message count: ${ctx.session.previousMessages.length}`);
});


/////

// Handle the /yo command to greet the user
yoMiddleWare(bot);

// session handling


// Suggest commands in the menu
void bot.api.setMyCommands([
    { command: 'yo', description: 'Be greeted by sloan' },
    { command: "quit", description: "quit the current conversation and reset chat state" },
]);

// Handle all other messages and the /start command
const introductionMessage = `Hello! I'm Sloan, your virtual assistant.
Right now we're in a private beta, so you may not be able to talk to me yet.

<b>Commands</b>
/yo - Be greeted by me
/chat - Start a chat with me`;

const replyWithIntro = (ctx: any) =>
    ctx.reply(introductionMessage,
        {
            parse_mode: 'HTML'
        }
    );

bot.command('start', replyWithIntro);
// bot.on('message', replyWithIntro);

// Start the server
if (process.env.NODE_ENV === 'production') {
    // Use Webhooks for the production server
    const app = express();
    app.use(express.json());
    app.use(webhookCallback(bot, 'express'));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Bot listening on port ${PORT}`);
    });
} else {
    // Use Long Polling for development
    bot.start();
}

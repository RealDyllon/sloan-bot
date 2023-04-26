import { Bot, Context, session, SessionFlavor, webhookCallback } from 'grammy';
import express from 'express';
import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from 'openai';
import { yoMiddleWare } from './commands/yo';
import { allowedUsers } from './allowedUsers';
import * as fs from 'fs';
import path from 'path';

// const OPENAI_MAX_TOKENS: number = parseInt(process.env.OPENAI_MAX_TOKENS || "") || 1000;
const MAX_MESSAGES: number = parseInt(process.env.MAX_MESSAGES || '') || 20;

// const IS_DEBUG = process.env.NODE_ENV === "development";
// console.log("ID_DEBUG=", process.env.NODE_ENV);

const configuration = new Configuration({
    organization: process.env.OPENAI_ORG,
    apiKey: process.env.OPENAI_API_KEY
});

const openai = new OpenAIApi(configuration);

//////

interface SessionData {
    previousMessages: Array<{
        role: ChatCompletionRequestMessageRoleEnum;
        content: string;
        time: number;
    }>;
    lastUserResponseTime: number;
}

export type MyContext = Context & SessionFlavor<SessionData>;

// Create a bot using the Telegram token
const bot = new Bot<MyContext>(process.env.TELEGRAM_TOKEN || '');

//////

// read file at env var path
const systemPrompt = fs.readFileSync(path.resolve(__dirname, '/botdata/system_prompt.txt'), 'utf8');

const initialChatPreviousMessages =
    [
        {
            role: ChatCompletionRequestMessageRoleEnum.System,
            // content: `You are a helpful assistant named Sloan.
            //         You will reply with a single short sentence, keeping the conversation fluid,
            //         like a regular text message conversation.
            //         Be short and succinct in your replies. Be cheerful and pleasant.
            //         `,
            content: systemPrompt,
            time: Date.now()
        }
    ];

function initial(): SessionData {
    return {
        lastUserResponseTime: 0,
        previousMessages: initialChatPreviousMessages
    };
}

bot.use(session({ initial }));

bot.on('message:text', async (ctx) => {
    const username = ctx.from?.username ?? '';

    if (!allowedUsers.includes(username)) {
        ctx.reply('oops you\'re not allowed to talk to me yet.');
        return;
    }

    if (ctx.message.text == '/quit') {
        ctx.session.previousMessages = initialChatPreviousMessages;
        await ctx.reply('quitting and resetting chat state');
        return;
    }

    // store user input
    const newUserMessage: (typeof ctx.session.previousMessages)[0] = {
        role: ChatCompletionRequestMessageRoleEnum.User,
        content: ctx.message.text ?? '',
        time: ctx.message.date
    };
    ctx.session.previousMessages.push(newUserMessage);

    // call api
    // const response = await openai.listEngines()
    // console.log(response);

    await bot.api.sendChatAction(ctx.chat.id, 'typing');

    await openai
        .createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: ctx.session.previousMessages.map(({ role, content }) => ({ role, content })),
            // max_tokens: OPENAI_MAX_TOKENS
            temperature: parseInt(process.env.CHATGPT_TEMPERATURE ?? "") || 1,
            top_p: parseInt(process.env.CHATGPT_TOP_P ?? "") || 1,
            presence_penalty: parseInt(process.env.CHATGPT_PRESENCE_PENALTY ?? "") || 0,
            frequency_penalty: parseInt(process.env.CHATGPT_FREQUENCY_PENALTY ?? "") || 0,
        })
        .then(async (completion) => {
            const completionString =
                completion.data.choices[0].message?.content ?? 'oops i don\'t know what to say';
            // console.log(completion.data.choices[0].message);

            // save api response to session
            const newAssistantMessage: (typeof ctx.session.previousMessages)[0] = {
                role: ChatCompletionRequestMessageRoleEnum.Assistant,
                content: completionString,
                time: Date.now()
            };
            ctx.session.previousMessages.push(newAssistantMessage);

            // reply
            await ctx.reply(completionString);

            if (ctx.session.previousMessages.length > MAX_MESSAGES) {
                ctx.session.previousMessages = [];
                await ctx.reply('I\'m getting tired, let\'s reset the chat state');
            }
        })
        .catch(async (err) => {
            console.log(err);
            ctx.session.previousMessages = [];
            await ctx.reply(
                'oops looks like ive crashed. report this to the bot administrator. resetting state.'
            );
            return;
        });
});

/////

bot.on('message:audio', async (ctx) => {
   // todo: handle audio
   await ctx.reply('sorry i can\'t handle voice notes yet');
});

// Handle the /yo command to greet the user
yoMiddleWare(bot);

bot.command('quit', (ctx) => {
    ctx.session.previousMessages = []; // wipe session
    return ctx.reply(`OK i'll reset chat state, 
    and forget about all previous messages
`);
});

// session handling

// Suggest commands in the menu
void bot.api.setMyCommands([
    { command: 'yo', description: 'Be greeted by sloan' },
    { command: 'quit', description: 'quit the current conversation and reset chat state' }
]);

// Handle all other messages and the /start command
const introductionMessage = `Hello! I'm Sloan, your virtual assistant.
Right now we're in a private beta, so you may not be able to talk to me yet.

Ask me a question :)
`;

const replyWithIntro = async (ctx: any) => {
    return ctx.reply(introductionMessage, {
        parse_mode: 'HTML'
    });
};

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

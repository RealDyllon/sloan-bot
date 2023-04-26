import { Bot } from "grammy";
import { MyContext } from "../bot.js";

export const yoMiddleWare = (bot: Bot<MyContext>) => {
  bot.command("yo", (ctx) => ctx.reply(`Yo ${ctx.from?.username}!`));
};

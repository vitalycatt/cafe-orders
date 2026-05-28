const { Bot, InlineKeyboard } = require('grammy');

const token = process.env.BOT_TOKEN;
if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
  console.warn('BOT_TOKEN not set — Telegram bot is disabled.');
  module.exports = null;
  return;
}

const bot = new Bot(token);
const appUrl = process.env.APP_URL || 'https://localhost:5173';

bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('Открыть приложение', appUrl);
  await ctx.reply('Добро пожаловать в систему заказов кафе! ☕', {
    reply_markup: keyboard,
  });
});

bot.start();
console.log('Telegram bot started');

module.exports = bot;

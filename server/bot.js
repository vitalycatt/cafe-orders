const noopBot = { sendPhoto: async () => { throw new Error('Bot is disabled'); } };

if (process.env.NODE_ENV === 'development') {
  console.log('Development mode — Telegram bot is disabled.');
  module.exports = noopBot;
  return;
}

const token = process.env.BOT_TOKEN;
if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
  console.warn('BOT_TOKEN not set — Telegram bot is disabled.');
  module.exports = noopBot;
  return;
}

const { Bot, InlineKeyboard, InputFile } = require('grammy');
const db = require('./db');

const bot = new Bot(token);
const appUrl = process.env.APP_URL || 'https://localhost:5173';

bot.command('start', async (ctx) => {
  const { id, username, first_name, last_name } = ctx.from || {};
  if (id) {
    try {
      await db.saveBotUser(id, username, first_name, last_name);
    } catch {}
  }

  const keyboard = new InlineKeyboard().webApp('Открыть приложение', appUrl);
  await ctx.reply('Добро пожаловать в систему заказов кафе! ☕', {
    reply_markup: keyboard,
  });
});

bot.start();
console.log('Telegram bot started');

module.exports = {
  sendPhoto: async (chatId, buffer, caption) => {
    await bot.api.sendPhoto(Number(chatId), new InputFile(buffer, 'receipt.jpg'), {
      caption: caption || undefined,
    });
  },
};

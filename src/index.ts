import { Bot } from 'grammy';
import { config } from './config/env';
import { getDatabase, closeDatabase } from './database';
import { banCheck } from './middleware/banCheck';
import { userTracker } from './middleware/userTracker';
import { startCommand, helpCommand } from './handlers/start';
import { handleTikTokUrl } from './handlers/download';
import {
  adminCommand,
  statsCommand,
  handleCallbackQuery,
  handleBroadcastMessage,
  handleBroadcastCallback,
} from './handlers/admin';

const bot = new Bot(config.BOT_TOKEN);

bot.use(userTracker);
bot.use(banCheck);

bot.command('start', startCommand);
bot.command('help', helpCommand);
bot.command('admin', adminCommand);
bot.command('stats', statsCommand);

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith('admin:') || data.startsWith('broadcast:')) {
    await handleCallbackQuery(ctx);
    await handleBroadcastCallback(ctx);
  } else {
    await ctx.answerCallbackQuery();
  }
});

bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;

  const session = (ctx as any).session;
  if (session?.waitingForBroadcast) {
    await handleBroadcastMessage(ctx);
    return;
  }

  await handleTikTokUrl(ctx);
});

bot.on('message:photo', async (ctx) => {
  const session = (ctx as any).session;
  if (session?.waitingForBroadcast) {
    await handleBroadcastMessage(ctx);
  }
});

bot.on('message:video', async (ctx) => {
  const session = (ctx as any).session;
  if (session?.waitingForBroadcast) {
    await handleBroadcastMessage(ctx);
  }
});

async function startBot(): Promise<void> {
  console.log('Initializing database...');
  getDatabase();

  console.log('Starting bot...');

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  bot.start({
    onStart: (botInfo) => {
      console.log(`Bot started as @${botInfo.username}`);
    },
  });

  console.log('Bot is running. Press Ctrl+C to stop.');
}

process.on('SIGINT', () => {
  console.log('Shutting down...');
  bot.stop();
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  bot.stop();
  closeDatabase();
  process.exit(0);
});

startBot().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
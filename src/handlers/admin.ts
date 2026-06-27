import { Context, InlineKeyboard } from 'grammy';
import { config } from '../config/env';
import {
  getAllUsers,
  getUserCount,
  getActiveUsersToday,
  banUser,
  unbanUser,
  getUserByTelegramId,
  getAllUserIds,
} from '../database/repos/user.repo';
import {
  getTotalDownloads,
  getSuccessfulDownloads,
  getFailedDownloads,
  getDownloadsToday,
  getDownloadsByUser,
  getTotalStorageUsed,
} from '../database/repos/download.repo';

function isAdmin(ctx: Context): boolean {
  return ctx.from?.id === config.ADMIN_TELEGRAM_ID;
}

const ITEMS_PER_PAGE = 5;

export async function adminCommand(ctx: Context): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.reply('⛔ You are not authorized to use this command.');
    return;
  }

  const keyboard = new InlineKeyboard()
    .text('📊 Statistics', 'admin:stats')
    .row()
    .text('👥 Users', 'admin:users')
    .text('📢 Broadcast', 'admin:broadcast');

  await ctx.reply('🔧 **Admin Panel**\n\nChoose an option:', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

export async function statsCommand(ctx: Context): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.reply('⛔ You are not authorized to use this command.');
    return;
  }

  await showStats(ctx);
}

async function showStats(ctx: Context, editMessage = false): Promise<void> {
  const totalUsers = getUserCount();
  const activeToday = getActiveUsersToday();
  const totalDownloads = getTotalDownloads();
  const successfulDownloads = getSuccessfulDownloads();
  const failedDownloads = getFailedDownloads();
  const downloadsToday = getDownloadsToday();
  const storageUsed = getTotalStorageUsed();

  const storageMB = (storageUsed / (1024 * 1024)).toFixed(2);

  const text =
    `📊 **Bot Statistics**\n\n` +
    `👥 **Users:**\n` +
    `• Total: ${totalUsers}\n` +
    `• Active today: ${activeToday}\n\n` +
    `📥 **Downloads:**\n` +
    `• Total: ${totalDownloads}\n` +
    `• Successful: ${successfulDownloads}\n` +
    `• Failed: ${failedDownloads}\n` +
    `• Today: ${downloadsToday}\n\n` +
    `💾 **Storage:**\n` +
    `• Used: ${storageMB} MB`;

  const keyboard = new InlineKeyboard().text('← Back', 'admin:main');

  if (editMessage && ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
}

async function showUserList(ctx: Context, page: number, editMessage = false): Promise<void> {
  const offset = page * ITEMS_PER_PAGE;
  const users = getAllUsers(offset, ITEMS_PER_PAGE);
  const totalCount = getUserCount();
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (users.length === 0) {
    const text = 'No users found.';
    const keyboard = new InlineKeyboard().text('← Back', 'admin:main');

    if (editMessage && ctx.callbackQuery) {
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } else {
      await ctx.reply(text, { reply_markup: keyboard });
    }
    return;
  }

  const keyboard = new InlineKeyboard();

  for (const user of users) {
    const displayName = user.username ? `@${user.username}` : user.first_name || `ID: ${user.telegram_id}`;
    const banStatus = user.is_banned ? '🚫' : '✅';

    keyboard.text(`${banStatus} ${displayName} (${user.total_downloads} DL)`, `admin:userinfo:${user.telegram_id}`).row();
  }

  if (page > 0) {
    keyboard.text('◀ Prev', `admin:users:${page - 1}`);
  }
  keyboard.text(`Page ${page + 1}/${totalPages}`, 'admin:noop');
  if (page < totalPages - 1) {
    keyboard.text('Next ▶', `admin:users:${page + 1}`);
  }
  keyboard.row();
  keyboard.text('← Back', 'admin:main');

  const text = `👥 **User List** (Page ${page + 1}/${totalPages})`;

  if (editMessage && ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
}

async function showUserInfo(ctx: Context, telegramId: number): Promise<void> {
  const user = getUserByTelegramId(telegramId);
  if (!user) {
    await ctx.reply('User not found.');
    return;
  }

  const stats = getDownloadsByUser(user.id);
  const displayName = user.username ? `@${user.username}` : user.first_name || 'Unknown';
  const banStatus = user.is_banned ? '🚫 Banned' : '✅ Active';

  const text =
    `👤 **User Details**\n\n` +
    `**Name:** ${displayName}\n` +
    `**Telegram ID:** ${user.telegram_id}\n` +
    `**Status:** ${banStatus}\n` +
    `**Created:** ${user.created_at}\n` +
    `**Last Active:** ${user.last_active_at}\n\n` +
    `📥 **Downloads:**\n` +
    `• Total: ${stats.total}\n` +
    `• Successful: ${stats.successful}\n` +
    `• Failed: ${stats.failed}`;

  const keyboard = new InlineKeyboard();

  if (user.is_banned) {
    keyboard.text('✅ Unban', `admin:unban:${telegramId}`);
  } else {
    keyboard.text('🚫 Ban', `admin:ban:${telegramId}`);
  }

  keyboard.row().text('← Back to Users', 'admin:users:0');

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

export async function handleCallbackQuery(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery?.data || !isAdmin(ctx)) {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: '⛔ Unauthorized', show_alert: true });
    }
    return;
  }

  const data = ctx.callbackQuery.data;

  if (data === 'admin:main') {
    const keyboard = new InlineKeyboard()
      .text('📊 Statistics', 'admin:stats')
      .row()
      .text('👥 Users', 'admin:users')
      .text('📢 Broadcast', 'admin:broadcast');

    await ctx.editMessageText('🔧 **Admin Panel**\n\nChoose an option:', {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } else if (data === 'admin:stats') {
    await showStats(ctx, true);
  } else if (data === 'admin:users' || data.startsWith('admin:users:')) {
    const parts = data.split(':');
    const page = parts.length > 2 ? parseInt(parts[2]) || 0 : 0;
    await showUserList(ctx, page, true);
  } else if (data === 'admin:noop') {
    await ctx.answerCallbackQuery();
  } else if (data.startsWith('admin:userinfo:')) {
    const telegramId = parseInt(data.split(':')[2]);
    await ctx.deleteMessage();
    await showUserInfo(ctx, telegramId);
  } else if (data.startsWith('admin:ban:')) {
    const telegramId = parseInt(data.split(':')[2]);
    banUser(telegramId);
    await ctx.answerCallbackQuery({ text: 'User banned' });
    await showUserInfo(ctx, telegramId);
  } else if (data.startsWith('admin:unban:')) {
    const telegramId = parseInt(data.split(':')[2]);
    unbanUser(telegramId);
    await ctx.answerCallbackQuery({ text: 'User unbanned' });
    await showUserInfo(ctx, telegramId);
  } else if (data === 'admin:broadcast') {
    await ctx.deleteMessage();
    await ctx.reply(
      '📢 **Broadcast Mode**\n\n' +
      'Send me the message you want to broadcast to all users.\n' +
      'Supported: text, photos, videos.\n\n' +
      'Type /cancel to exit broadcast mode.',
      { parse_mode: 'Markdown' }
    );
    (ctx as any).session = { waitingForBroadcast: true };
  }

  await ctx.answerCallbackQuery();
}

const broadcastSessions = new Map<number, { waiting: boolean; message?: any }>();

export async function handleBroadcastMessage(ctx: Context): Promise<void> {
  if (!ctx.from || !isAdmin(ctx)) return;

  if (ctx.message?.text === '/cancel') {
    broadcastSessions.delete(ctx.from.id);
    await ctx.reply('Broadcast cancelled.');
    return;
  }

  const session = broadcastSessions.get(ctx.from.id);
  if (!session?.waiting) return;

  broadcastSessions.delete(ctx.from.id);

  const userCount = getAllUserIds().length;
  const keyboard = new InlineKeyboard()
    .text(`✅ Confirm (${userCount} users)`, 'broadcast:confirm')
    .text('❌ Cancel', 'broadcast:cancel');

  await ctx.reply(
    `📢 **Broadcast Preview**\n\nThis message will be sent to ${userCount} users.\n\nProceed?`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  );

  (ctx as any).broadcastMessage = ctx.message;
}

export async function handleBroadcastCallback(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery?.data || !isAdmin(ctx)) return;

  const data = ctx.callbackQuery.data;

  if (data === 'broadcast:confirm') {
    const message = (ctx as any).broadcastMessage;
    if (!message) {
      await ctx.answerCallbackQuery({ text: 'No message to broadcast', show_alert: true });
      return;
    }

    await ctx.editMessageText('📢 Broadcasting...');

    const userIds = getAllUserIds();
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        if (message.text) {
          await ctx.api.sendMessage(userId, message.text, { parse_mode: 'Markdown' });
        } else if (message.photo) {
          await ctx.api.sendPhoto(userId, message.photo[message.photo.length - 1].file_id, {
            caption: message.caption,
          });
        } else if (message.video) {
          await ctx.api.sendVideo(userId, message.video.file_id, {
            caption: message.caption,
          });
        }
        sent++;

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        failed++;
      }
    }

    await ctx.editMessageText(
      `📢 **Broadcast Complete**\n\n` +
      `✅ Sent: ${sent}\n` +
      `❌ Failed: ${failed}`
    );
  } else if (data === 'broadcast:cancel') {
    await ctx.editMessageText('📢 Broadcast cancelled.');
  }

  await ctx.answerCallbackQuery();
}
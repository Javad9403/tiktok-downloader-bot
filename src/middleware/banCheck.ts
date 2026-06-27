import { Context, NextFunction } from 'grammy';
import { getUserByTelegramId } from '../database/repos/user.repo';

export async function banCheck(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.from) {
    await next();
    return;
  }

  const user = getUserByTelegramId(ctx.from.id);
  if (user && user.is_banned) {
    await ctx.reply('Your account has been restricted. Contact support.');
    return;
  }

  await next();
}
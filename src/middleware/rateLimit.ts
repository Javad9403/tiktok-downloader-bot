import { Context, NextFunction } from 'grammy';
import { canDownload, incrementDownloads } from '../database/repos/user.repo';
import { config } from '../config/env';

export async function rateLimit(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.from) {
    await next();
    return;
  }

  const { allowed, remaining } = canDownload(ctx.from.id, config.DAILY_DOWNLOAD_LIMIT);

  if (!allowed) {
    await ctx.reply(`You've reached your daily download limit (${config.DAILY_DOWNLOAD_LIMIT}). Try again tomorrow.`);
    return;
  }

  if (remaining <= 5 && remaining > 0) {
    (ctx as any).rateLimitWarning = remaining;
  }

  await next();
}

export function recordDownload(telegramId: number): void {
  incrementDownloads(telegramId);
}
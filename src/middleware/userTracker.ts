import { Context, NextFunction } from 'grammy';
import { upsertUser } from '../database/repos/user.repo';

export async function userTracker(ctx: Context, next: NextFunction): Promise<void> {
  if (ctx.from) {
    upsertUser(
      ctx.from.id,
      ctx.from.username,
      ctx.from.first_name,
      ctx.from.last_name
    );
  }

  await next();
}
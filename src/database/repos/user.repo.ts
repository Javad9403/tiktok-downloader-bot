import { getDatabase } from '../index';

export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_banned: number;
  banned_at: string | null;
  daily_downloads: number;
  daily_reset_at: string | null;
  total_downloads: number;
  created_at: string;
  last_active_at: string;
}

export function upsertUser(telegramId: number, username?: string, firstName?: string, lastName?: string): User {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  const existing = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as User | undefined;

  if (existing) {
    if (existing.daily_reset_at !== today) {
      db.prepare('UPDATE users SET daily_downloads = 0, daily_reset_at = ?, last_active_at = CURRENT_TIMESTAMP WHERE telegram_id = ?').run(today, telegramId);
    } else {
      db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP, username = COALESCE(?, username), first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name) WHERE telegram_id = ?').run(username, firstName, lastName, telegramId);
    }
    return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as User;
  }

  db.prepare('INSERT INTO users (telegram_id, username, first_name, last_name, daily_reset_at) VALUES (?, ?, ?, ?, ?)').run(telegramId, username || null, firstName || null, lastName || null, today);
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as User;
}

export function getUserByTelegramId(telegramId: number): User | undefined {
  return getDatabase().prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as User | undefined;
}

export function banUser(telegramId: number): void {
  getDatabase().prepare('UPDATE users SET is_banned = 1, banned_at = CURRENT_TIMESTAMP WHERE telegram_id = ?').run(telegramId);
}

export function unbanUser(telegramId: number): void {
  getDatabase().prepare('UPDATE users SET is_banned = 0, banned_at = NULL WHERE telegram_id = ?').run(telegramId);
}

export function canDownload(telegramId: number, limit: number): { allowed: boolean; remaining: number } {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const user = db.prepare('SELECT daily_downloads, daily_reset_at FROM users WHERE telegram_id = ?').get(telegramId) as { daily_downloads: number; daily_reset_at: string } | undefined;

  if (!user) return { allowed: true, remaining: limit };

  if (user.daily_reset_at !== today) {
    db.prepare('UPDATE users SET daily_downloads = 0, daily_reset_at = ? WHERE telegram_id = ?').run(today, telegramId);
    return { allowed: true, remaining: limit };
  }

  const remaining = limit - user.daily_downloads;
  return { allowed: user.daily_downloads < limit, remaining: Math.max(0, remaining) };
}

export function incrementDownloads(telegramId: number): void {
  getDatabase().prepare('UPDATE users SET daily_downloads = daily_downloads + 1, total_downloads = total_downloads + 1 WHERE telegram_id = ?').run(telegramId);
}

export function getAllUsers(offset: number, limit: number): User[] {
  return getDatabase().prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as User[];
}

export function getUserCount(): number {
  const result = getDatabase().prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  return result.count;
}

export function getActiveUsersToday(): number {
  const result = getDatabase().prepare("SELECT COUNT(*) as count FROM users WHERE last_active_at >= date('now')").get() as { count: number };
  return result.count;
}

export function getAllUserIds(): number[] {
  const rows = getDatabase().prepare('SELECT telegram_id FROM users WHERE is_banned = 0').all() as { telegram_id: number }[];
  return rows.map(r => r.telegram_id);
}
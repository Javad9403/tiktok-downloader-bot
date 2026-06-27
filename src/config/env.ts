import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  BOT_TOKEN: requireEnv('BOT_TOKEN'),
  ADMIN_TELEGRAM_ID: parseInt(requireEnv('ADMIN_TELEGRAM_ID'), 10),
  DAILY_DOWNLOAD_LIMIT: parseInt(optionalEnv('DAILY_DOWNLOAD_LIMIT', '20'), 10),
  DATABASE_PATH: optionalEnv('DATABASE_PATH', './data/bot.db'),
  MAX_VIDEO_SIZE_MB: parseInt(optionalEnv('MAX_VIDEO_SIZE_MB', '50'), 10),
  DOWNLOAD_TIMEOUT_MS: parseInt(optionalEnv('DOWNLOAD_TIMEOUT_MS', '60000'), 10),
  TEMP_DIR: optionalEnv('TEMP_DIR', '/tmp/tiktok-bot'),
} as const;
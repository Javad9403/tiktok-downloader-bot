import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { config } from '../config/env';

const execFileAsync = promisify(execFile);

export type Platform = 'tiktok' | 'youtube' | 'instagram';

const TIKTOK_URL_REGEX = /https?:\/\/(?:www\.)?tiktok\.com\/.+|https?:\/\/vm\.tiktok\.com\/.+/gi;
const YOUTUBE_URL_REGEX = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/).+/gi;
const INSTAGRAM_URL_REGEX = /https?:\/\/(?:www\.)?(?:instagram\.com\/(?:p|reel)\/).+/gi;

export function detectPlatform(text: string): { url: string; platform: Platform } | null {
  const tiktokMatch = text.match(TIKTOK_URL_REGEX);
  if (tiktokMatch) return { url: tiktokMatch[0], platform: 'tiktok' };

  const youtubeMatch = text.match(YOUTUBE_URL_REGEX);
  if (youtubeMatch) return { url: youtubeMatch[0], platform: 'youtube' };

  const instagramMatch = text.match(INSTAGRAM_URL_REGEX);
  if (instagramMatch) return { url: instagramMatch[0], platform: 'instagram' };

  return null;
}

export interface DownloadResult {
  filePath: string;
  fileSize: number;
}

export async function downloadVideo(url: string, platform?: Platform): Promise<DownloadResult> {
  const tempDir = path.join(config.TEMP_DIR, randomUUID());
  fs.mkdirSync(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, 'video.mp4');

  const args = [
    '--no-playlist',
    '--no-warnings',
    '-f', 'best',
    '-o', outputPath,
    url,
  ];

  try {
    await execFileAsync('yt-dlp', args, {
      timeout: config.DOWNLOAD_TIMEOUT_MS,
    });

    if (!fs.existsSync(outputPath)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw new Error('DOWNLOAD_FAILED');
    }

    const stats = fs.statSync(outputPath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > config.MAX_VIDEO_SIZE_MB) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw new Error('VIDEO_TOO_LARGE');
    }

    return { filePath: outputPath, fileSize: stats.size };
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });

    if (error instanceof Error) {
      if (error.message.includes('VIDEO_TOO_LARGE')) {
        throw error;
      }
      if (error.message.includes('This video is private') || error.message.includes('Login required')) {
        throw new Error('PRIVATE_VIDEO');
      }
      if (error.message.includes('Video not available') || error.message.includes('Not Found')) {
        throw new Error('NOT_AVAILABLE');
      }
    }
    throw new Error('DOWNLOAD_FAILED');
  }
}

export function cleanupTempFile(filePath: string): void {
  try {
    const dir = path.dirname(filePath);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

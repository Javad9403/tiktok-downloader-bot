import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { config } from '../config/env';

const execFileAsync = promisify(execFile);

export const TIKTOK_URL_REGEX = /https?:\/\/(?:www\.)?tiktok\.com\/.+|https?:\/\/vm\.tiktok\.com\/.+/gi;

export function extractTikTokUrl(text: string): string | null {
  const matches = text.match(TIKTOK_URL_REGEX);
  return matches ? matches[0] : null;
}

export interface DownloadResult {
  filePath: string;
  fileSize: number;
}

export async function downloadTikTokVideo(url: string): Promise<DownloadResult> {
  const tempDir = path.join(config.TEMP_DIR, randomUUID());
  fs.mkdirSync(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, 'video.mp4');

  try {
    await execFileAsync('yt-dlp', [
      '--no-playlist',
      '--no-warnings',
      '-f', 'best',
      '-o', outputPath,
      url,
    ], {
      timeout: config.DOWNLOAD_TIMEOUT_MS,
    });

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
      if (error.message.includes('This video is private')) {
        throw new Error('PRIVATE_VIDEO');
      }
      if (error.message.includes('Video not available')) {
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
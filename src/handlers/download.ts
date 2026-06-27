import { Context, InputFile } from 'grammy';
import fs from 'fs';
import { detectPlatform, downloadVideo, cleanupTempFile, Platform } from '../utils/downloader';
import { createDownload, completeDownload, failDownload } from '../database/repos/download.repo';
import { getUserByTelegramId } from '../database/repos/user.repo';
import { recordDownload } from '../middleware/rateLimit';

const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  youtube: 'YouTube',
  instagram: 'Instagram',
};

const PLATFORM_EMOJIS: Record<Platform, string> = {
  tiktok: '🎵',
  youtube: '▶️',
  instagram: '📸',
};

export async function handleUrl(ctx: Context): Promise<void> {
  if (!ctx.message?.text || !ctx.from) return;

  const result = detectPlatform(ctx.message.text);
  if (!result) return;

  const { url, platform } = result;
  const user = getUserByTelegramId(ctx.from.id);
  if (!user) return;

  const download = createDownload(user.id, url, platform);

  const statusMsg = await ctx.reply(`⏳ Downloading ${PLATFORM_LABELS[platform]} video...`);

  try {
    const downloadResult = await downloadVideo(url, platform);

    try {
      await ctx.replyWithVideo(
        new InputFile(fs.createReadStream(downloadResult.filePath)),
        { caption: `${PLATFORM_EMOJIS[platform]} ${PLATFORM_LABELS[platform]} video downloaded successfully!` }
      );

      completeDownload(download.id, downloadResult.fileSize);
      recordDownload(ctx.from.id);

      if ((ctx as any).rateLimitWarning) {
        await ctx.reply(`⚠️ You have ${(ctx as any).rateLimitWarning} downloads remaining today.`);
      }
    } catch (sendError) {
      failDownload(download.id, 'Failed to send video to Telegram');
      await ctx.reply('❌ Failed to send video. The file might be too large or corrupted.');
    } finally {
      cleanupTempFile(downloadResult.filePath);
    }
  } catch (error) {
    let errorMessage = 'Failed to download video.';
    if (error instanceof Error) {
      switch (error.message) {
        case 'VIDEO_TOO_LARGE':
          errorMessage = 'This video is too large to send via Telegram (>50MB).';
          break;
        case 'PRIVATE_VIDEO':
          errorMessage = `This ${PLATFORM_LABELS[platform].toLowerCase()} content is private and cannot be downloaded.`;
          break;
        case 'NOT_AVAILABLE':
          errorMessage = `This ${PLATFORM_LABELS[platform].toLowerCase()} content is not available or has been removed.`;
          break;
        case 'DOWNLOAD_FAILED':
          errorMessage = `Failed to download this ${PLATFORM_LABELS[platform].toLowerCase()} video. Please check the link and try again.`;
          break;
      }
    }

    failDownload(download.id, errorMessage);
    await ctx.reply(`❌ ${errorMessage}`);
  } finally {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id);
    } catch {
      // Ignore delete errors
    }
  }
}

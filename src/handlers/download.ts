import { Context, InputFile } from 'grammy';
import fs from 'fs';
import { extractTikTokUrl, downloadTikTokVideo, cleanupTempFile } from '../utils/tiktok';
import { createDownload, completeDownload, failDownload } from '../database/repos/download.repo';
import { getUserByTelegramId } from '../database/repos/user.repo';
import { recordDownload } from '../middleware/rateLimit';

export async function handleTikTokUrl(ctx: Context): Promise<void> {
  if (!ctx.message?.text || !ctx.from) return;

  const url = extractTikTokUrl(ctx.message.text);
  if (!url) return;

  const user = getUserByTelegramId(ctx.from.id);
  if (!user) return;

  const download = createDownload(user.id, url);

  const statusMsg = await ctx.reply('⏳ Downloading video...');

  try {
    const result = await downloadTikTokVideo(url);

    try {
      await ctx.replyWithVideo(
        new InputFile(fs.createReadStream(result.filePath)),
        { caption: `📹 TikTok video downloaded successfully!` }
      );

      completeDownload(download.id, result.fileSize);
      recordDownload(ctx.from.id);

      if ((ctx as any).rateLimitWarning) {
        await ctx.reply(`⚠️ You have ${(ctx as any).rateLimitWarning} downloads remaining today.`);
      }
    } catch (sendError) {
      failDownload(download.id, 'Failed to send video to Telegram');
      await ctx.reply('❌ Failed to send video. The file might be too large or corrupted.');
    } finally {
      cleanupTempFile(result.filePath);
    }
  } catch (error) {
    let errorMessage = 'Failed to download video.';
    if (error instanceof Error) {
      switch (error.message) {
        case 'VIDEO_TOO_LARGE':
          errorMessage = 'This video is too large to send via Telegram (>50MB).';
          break;
        case 'PRIVATE_VIDEO':
          errorMessage = 'This video is private and cannot be downloaded.';
          break;
        case 'NOT_AVAILABLE':
          errorMessage = 'This video is not available or has been removed.';
          break;
        case 'DOWNLOAD_FAILED':
          errorMessage = 'Failed to download this video. Please check the link and try again.';
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
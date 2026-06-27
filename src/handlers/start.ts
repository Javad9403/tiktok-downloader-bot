import { Context } from 'grammy';

export async function startCommand(ctx: Context): Promise<void> {
  const name = ctx.from?.first_name || 'there';
  await ctx.reply(
    `👋 Hello ${name}!\n\n` +
    `I can download TikTok videos for you.\n\n` +
    `**How to use:**\n` +
    `Simply send me a TikTok link and I'll download the video for you!\n\n` +
    `**Supported links:**\n` +
    `• tiktok.com/...\n` +
    `• vm.tiktok.com/...\n\n` +
    `Type /help for more information.`,
    { parse_mode: 'Markdown' }
  );
}

export async function helpCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    `📖 **Help**\n\n` +
    `**Commands:**\n` +
    `/start - Start the bot\n` +
    `/help - Show this help message\n\n` +
    `**How to download:**\n` +
    `1. Find a TikTok video\n` +
    `2. Copy the share link\n` +
    `3. Send the link here\n` +
    `4. I'll download and send the video!\n\n` +
    `**Notes:**\n` +
    `• Only public videos can be downloaded\n` +
    `• Video size limit: 50MB\n` +
    `• Daily download limit applies`,
    { parse_mode: 'Markdown' }
  );
}
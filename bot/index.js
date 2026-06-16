import { Telegraf, session } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

import logger from '../shared/logger.js';
import { registerUser, requireNotBanned, requireAdmin } from './middleware/auth.js';
import { startCommand } from './commands/start.js';
import { helpCommand } from './commands/help.js';
import { profileCommand } from './commands/profile.js';
import { balanceCommand } from './commands/balance.js';
import { referralCommand } from './commands/referral.js';
import { dailyCommand } from './commands/daily.js';
import { statsCommand } from './commands/stats.js';
import { supportCommand, handleNewTicket, handleMyTickets, handleSupportMessage } from './commands/support.js';
import { adminPanelCommand } from './commands/admin/panel.js';
import { broadcastCommand, handleBroadcastMessage, executeBroadcast, getBroadcastState } from './commands/admin/broadcast.js';
import { adminUsersCommand, banCommand, unbanCommand } from './commands/admin/users.js';
import { adminCreatePostCommand, handlePostCreation, togglePlatform, confirmPost, getPostState } from './commands/admin/post.js';
import { query } from '../shared/db.js';

export const createBot = () => {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    logger.warn('BOT_TOKEN not set — Telegram bot will not start');
    return null;
  }

  const bot = new Telegraf(token);

  // Session
  bot.use(session());

  // Register user middleware
  bot.use(registerUser);
  bot.use(requireNotBanned);

  // User commands
  bot.command('start', startCommand);
  bot.command('help', helpCommand);
  bot.command('profile', profileCommand);
  bot.command('balance', balanceCommand);
  bot.command('referral', referralCommand);
  bot.command('daily', dailyCommand);
  bot.command('stats', statsCommand);
  bot.command('support', supportCommand);
  bot.command('settings', async (ctx) => {
    await ctx.reply('⚙️ <b>Settings</b>\n\nManage your preferences:', {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '🌐 Language', callback_data: 'set_language' }, { text: '🔔 Notifications', callback_data: 'set_notifications' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] },
    });
  });

  // Admin commands
  bot.command('panel', requireAdmin, adminPanelCommand);
  bot.command('broadcast', requireAdmin, broadcastCommand);
  bot.command('users', requireAdmin, adminUsersCommand);
  bot.command('ban', requireAdmin, banCommand);
  bot.command('unban', requireAdmin, unbanCommand);
  bot.command('channels', requireAdmin, async (ctx) => {
    const { rows } = await query('SELECT * FROM channels WHERE is_active = true LIMIT 10');
    const list = rows.map(c => `• ${c.channel_name} (${c.platform})`).join('\n') || 'No channels configured.';
    await ctx.reply(`📢 <b>Active Channels:</b>\n\n${list}\n\nManage channels from the web dashboard.`, { parse_mode: 'HTML' });
  });
  bot.command('logs', requireAdmin, async (ctx) => {
    const { rows } = await query("SELECT level, message, created_at FROM logs ORDER BY created_at DESC LIMIT 10");
    const list = rows.map(l => `[${l.level.toUpperCase()}] ${l.message.slice(0, 60)}`).join('\n') || 'No recent logs.';
    await ctx.reply(`📋 <b>Recent Logs:</b>\n\n<code>${list}</code>`, { parse_mode: 'HTML' });
  });
  bot.command('post', requireAdmin, adminCreatePostCommand);

  // Callback query handler
  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery?.data;
    await ctx.answerCbQuery();

    const handlers = {
      'main_menu': () => startCommand(ctx),
      'profile': () => profileCommand(ctx),
      'balance': () => balanceCommand(ctx),
      'daily': () => dailyCommand(ctx),
      'referral': () => referralCommand(ctx),
      'rewards': async () => {
        const { rows } = await query('SELECT * FROM rewards WHERE is_active = true ORDER BY points_value DESC LIMIT 10');
        const list = rows.map(r => `• <b>${r.name}</b> — ${r.points_value} pts`).join('\n') || 'No rewards available.';
        await ctx.reply(`🏆 <b>Available Rewards:</b>\n\n${list}`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🏠 Menu', callback_data: 'main_menu' }]] } });
      },
      'user_stats': () => statsCommand(ctx),
      'support': () => supportCommand(ctx),
      'new_ticket': () => handleNewTicket(ctx),
      'my_tickets': () => handleMyTickets(ctx),
      'settings_menu': () => ctx.reply('⚙️ Settings — Use the web dashboard for advanced settings.'),
      // Admin callbacks
      'admin_panel': () => adminPanelCommand(ctx),
      'admin_broadcast': () => broadcastCommand(ctx),
      'admin_users': () => adminUsersCommand(ctx),
      'admin_create_post': () => adminCreatePostCommand(ctx),
      'admin_stats': () => statsCommand(ctx),
      'admin_tickets': async () => {
        const { rows } = await query("SELECT t.id, t.subject, t.status, u.first_name FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE t.status = 'open' LIMIT 10");
        const list = rows.map(t => `#${t.id} — ${t.first_name}: ${t.subject.slice(0, 30)}`).join('\n') || 'No open tickets.';
        await ctx.reply(`🎫 <b>Open Tickets:</b>\n\n${list}\n\nManage tickets from the web dashboard.`, { parse_mode: 'HTML' });
      },
      'confirm_broadcast': () => executeBroadcast(ctx, bot),
      'cancel_broadcast': () => { getBroadcastState().delete(ctx.from.id); ctx.editMessageText('❌ Broadcast cancelled.'); },
      'confirm_platforms': () => confirmPost(ctx),
      'cancel_post': () => { getPostState().delete(ctx.from.id); ctx.editMessageText('❌ Post cancelled.'); },
    };

    if (data?.startsWith('toggle_platform_')) {
      return togglePlatform(ctx);
    }

    const handler = handlers[data];
    if (handler) {
      await handler().catch(err => logger.error(`Callback error [${data}]: ${err.message}`));
    }
  });

  // Text message handler (for state machines)
  bot.on('message', async (ctx) => {
    if (ctx.message?.text?.startsWith('/')) return;
    // Support ticket flow
    const supportHandled = await handleSupportMessage(ctx);
    if (supportHandled) return;
    // Broadcast flow (admin)
    if (getBroadcastState().has(ctx.from.id)) {
      await handleBroadcastMessage(ctx);
      return;
    }
    // Post creation flow (admin)
    if (getPostState().has(ctx.from.id)) {
      await handlePostCreation(ctx);
      return;
    }
  });

  // Error handler
  bot.catch((err, ctx) => {
    logger.error(`Bot error for ${ctx?.updateType}: ${err.message}`);
  });

  return bot;
};

export const startBot = async (bot) => {
  if (!bot) return;
  try {
    await bot.launch();
    const botInfo = await bot.telegram.getMe();
    logger.info(`🤖 Telegram bot @${botInfo.username} started successfully`);
    // Set commands list
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Main menu' },
      { command: 'help', description: 'Show help' },
      { command: 'profile', description: 'Your profile' },
      { command: 'balance', description: 'Check balance' },
      { command: 'referral', description: 'Referral system' },
      { command: 'rewards', description: 'View rewards' },
      { command: 'daily', description: 'Daily bonus' },
      { command: 'support', description: 'Support tickets' },
      { command: 'stats', description: 'Platform statistics' },
    ]);
  } catch (err) {
    logger.error(`Failed to start bot: ${err.message}`);
  }
};

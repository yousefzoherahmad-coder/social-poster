import { query } from '../../../shared/db.js';

export const adminUsersCommand = async (ctx) => {
  const [total, active, banned] = await Promise.all([
    query('SELECT COUNT(*) FROM users'),
    query("SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL '24 hours'"),
    query('SELECT COUNT(*) FROM users WHERE is_banned = true'),
  ]);

  await ctx.reply(
    `👥 <b>User Management</b>\n\n` +
    `Total: <b>${total.rows[0].count}</b>\n` +
    `Active (24h): <b>${active.rows[0].count}</b>\n` +
    `Banned: <b>${banned.rows[0].count}</b>`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔍 Search User', callback_data: 'search_user' }],
          [{ text: '🚫 Banned Users', callback_data: 'list_banned' }],
          [{ text: '🔙 Admin Panel', callback_data: 'admin_panel' }],
        ],
      },
    }
  );
};

export const banCommand = async (ctx) => {
  const args = ctx.message?.text?.split(' ');
  const telegramId = args?.[1];
  const reason = args?.slice(2).join(' ') || 'Banned by admin';

  if (!telegramId) {
    return ctx.reply('Usage: /ban <telegram_id> [reason]');
  }

  const { rows } = await query(
    'UPDATE users SET is_banned = true, ban_reason = $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING *',
    [reason, parseInt(telegramId)]
  );

  if (!rows[0]) return ctx.reply(`❌ User ${telegramId} not found.`);
  await ctx.reply(`✅ User <b>${rows[0].first_name}</b> (${telegramId}) has been banned.\nReason: ${reason}`, { parse_mode: 'HTML' });

  try {
    await ctx.telegram.sendMessage(parseInt(telegramId), `🚫 You have been banned from this bot.\nReason: ${reason}`);
  } catch {}
};

export const unbanCommand = async (ctx) => {
  const args = ctx.message?.text?.split(' ');
  const telegramId = args?.[1];

  if (!telegramId) return ctx.reply('Usage: /unban <telegram_id>');

  const { rows } = await query(
    'UPDATE users SET is_banned = false, ban_reason = NULL, updated_at = NOW() WHERE telegram_id = $1 RETURNING *',
    [parseInt(telegramId)]
  );

  if (!rows[0]) return ctx.reply(`❌ User ${telegramId} not found.`);
  await ctx.reply(`✅ User <b>${rows[0].first_name}</b> (${telegramId}) has been unbanned.`, { parse_mode: 'HTML' });

  try {
    await ctx.telegram.sendMessage(parseInt(telegramId), '✅ Your ban has been lifted. You can now use the bot again.');
  } catch {}
};

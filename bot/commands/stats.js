import { query } from '../../shared/db.js';

export const statsCommand = async (ctx) => {
  const [users, channels, posts, rewards] = await Promise.all([
    query('SELECT COUNT(*) FROM users WHERE is_banned = false'),
    query('SELECT COUNT(*) FROM channels WHERE is_active = true'),
    query("SELECT COUNT(*) FROM posts WHERE status = 'published'"),
    query('SELECT SUM(points) FROM users'),
  ]);

  await ctx.reply(
    `📊 <b>Platform Statistics</b>\n\n` +
    `👥 <b>Total Users:</b> ${users.rows[0].count}\n` +
    `📢 <b>Active Channels:</b> ${channels.rows[0].count}\n` +
    `📝 <b>Posts Published:</b> ${posts.rows[0].count}\n` +
    `💰 <b>Total Points Distributed:</b> ${rewards.rows[0].sum || 0}\n`,
    {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] },
    }
  );
};

import { query } from '../../../shared/db.js';

export const adminPanelCommand = async (ctx) => {
  const [users, posts, tickets, channels] = await Promise.all([
    query('SELECT COUNT(*) FROM users'),
    query("SELECT COUNT(*) FROM posts WHERE status = 'published'"),
    query("SELECT COUNT(*) FROM tickets WHERE status = 'open'"),
    query('SELECT COUNT(*) FROM channels WHERE is_active = true'),
  ]);

  const text =
    `🔧 <b>Admin Panel</b>\n\n` +
    `👥 Total Users: <b>${users.rows[0].count}</b>\n` +
    `📝 Published Posts: <b>${posts.rows[0].count}</b>\n` +
    `🎫 Open Tickets: <b>${tickets.rows[0].count}</b>\n` +
    `📢 Active Channels: <b>${channels.rows[0].count}</b>`;

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📢 Broadcast', callback_data: 'admin_broadcast' }, { text: '👥 Users', callback_data: 'admin_users' }],
        [{ text: '📝 Create Post', callback_data: 'admin_create_post' }, { text: '📊 Full Stats', callback_data: 'admin_stats' }],
        [{ text: '🎫 Tickets', callback_data: 'admin_tickets' }, { text: '📢 Channels', callback_data: 'admin_channels' }],
        [{ text: '⚙️ Settings', callback_data: 'admin_settings' }, { text: '📋 Logs', callback_data: 'admin_logs' }],
      ],
    },
  });
};

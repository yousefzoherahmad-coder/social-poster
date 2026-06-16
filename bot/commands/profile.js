import { query } from '../../shared/db.js';

export const profileCommand = async (ctx) => {
  const user = ctx.dbUser;
  if (!user) return ctx.reply('❌ User not found. Try /start first.');

  const { rows: rewardRows } = await query(
    'SELECT SUM(points_earned) as total FROM user_rewards WHERE user_id = $1',
    [user.id]
  );
  const { rows: referralRows } = await query(
    'SELECT COUNT(*) FROM referrals WHERE referrer_id = $1',
    [user.id]
  );
  const { rows: ticketRows } = await query(
    "SELECT COUNT(*) FROM tickets WHERE user_id = $1 AND status != 'closed'",
    [user.id]
  );

  const joinDate = new Date(user.joined_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lastActive = new Date(user.last_active).toLocaleString('en-US');

  const profileText = `
<b>👤 Your Profile</b>

🆔 <b>ID:</b> <code>${user.telegram_id}</code>
👤 <b>Name:</b> ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}
${user.username ? `📛 <b>Username:</b> @${user.username}\n` : ''}
💰 <b>Points:</b> <b>${user.points}</b>
🔗 <b>Referrals:</b> ${user.referral_count}
🏆 <b>Total Earned:</b> ${rewardRows[0]?.total || 0} pts
🎫 <b>Open Tickets:</b> ${ticketRows[0]?.count || 0}

📅 <b>Joined:</b> ${joinDate}
🕐 <b>Last Active:</b> ${lastActive}

🔗 <b>Your Referral Code:</b>
<code>REF${user.telegram_id}</code>
`;

  await ctx.reply(profileText, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎁 Daily Bonus', callback_data: 'daily' }, { text: '🔗 Share Referral', callback_data: 'referral' }],
        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
      ],
    },
  });
};

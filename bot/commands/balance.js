import { query } from '../../shared/db.js';

export const balanceCommand = async (ctx) => {
  const user = ctx.dbUser;
  if (!user) return ctx.reply('❌ Please /start first.');

  const { rows: rewardRows } = await query(
    "SELECT reward_type, SUM(points_earned) as total FROM user_rewards WHERE user_id = $1 GROUP BY reward_type",
    [user.id]
  );

  const breakdown = rewardRows.map(r =>
    `• ${r.reward_type.replace('_', ' ')}: +${r.total} pts`
  ).join('\n') || '• No earnings yet';

  const { rows: leaderRow } = await query(
    'SELECT COUNT(*) as rank FROM users WHERE points > $1 AND is_banned = false',
    [user.points]
  );
  const rank = parseInt(leaderRow[0]?.rank || 0) + 1;

  await ctx.reply(
    `💰 <b>Your Balance</b>\n\n` +
    `🏆 <b>Points: ${user.points}</b>\n` +
    `📊 Leaderboard rank: <b>#${rank}</b>\n\n` +
    `<b>Earnings breakdown:</b>\n${breakdown}`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎁 Claim Daily Bonus', callback_data: 'daily' }],
          [{ text: '🏆 View Rewards', callback_data: 'rewards' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
        ],
      },
    }
  );
};

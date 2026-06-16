import { query } from '../../shared/db.js';

export const dailyCommand = async (ctx) => {
  const user = ctx.dbUser;
  if (!user) return ctx.reply('❌ Please /start first.');

  // Check if already claimed today
  const { rows: lastClaim } = await query(
    "SELECT * FROM daily_bonuses WHERE user_id = $1 AND claimed_at > NOW() - INTERVAL '24 hours' ORDER BY claimed_at DESC LIMIT 1",
    [user.id]
  );

  if (lastClaim.length > 0) {
    const nextClaim = new Date(lastClaim[0].claimed_at);
    nextClaim.setHours(nextClaim.getHours() + 24);
    const hoursLeft = Math.ceil((nextClaim - Date.now()) / 3600000);
    return ctx.reply(
      `⏰ <b>Daily bonus already claimed!</b>\n\nCome back in <b>${hoursLeft} hour(s)</b> for your next bonus.\n\n💰 Current points: <b>${user.points}</b>`,
      { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } }
    );
  }

  // Calculate streak
  const { rows: recentClaims } = await query(
    "SELECT * FROM daily_bonuses WHERE user_id = $1 AND claimed_at > NOW() - INTERVAL '48 hours' ORDER BY claimed_at DESC LIMIT 1",
    [user.id]
  );
  const streakDay = recentClaims.length > 0 ? (recentClaims[0].streak_day + 1) : 1;

  const { rows: settingRows } = await query("SELECT value FROM settings WHERE key = 'daily_bonus_points'");
  const basePoints = parseInt(settingRows[0]?.value || '10');
  const { rows: maxStreakRows } = await query("SELECT value FROM settings WHERE key = 'max_daily_streak'");
  const maxStreak = parseInt(maxStreakRows[0]?.value || '30');

  const streakMultiplier = Math.min(streakDay, maxStreak);
  const bonus = Math.floor(basePoints * (1 + (streakMultiplier - 1) * 0.1));

  await query('INSERT INTO daily_bonuses (user_id, points_awarded, streak_day) VALUES ($1, $2, $3)', [user.id, bonus, streakDay]);
  await query('UPDATE users SET points = points + $1, updated_at = NOW() WHERE id = $2', [bonus, user.id]);
  await query('INSERT INTO user_rewards (user_id, reward_type, points_earned) VALUES ($1, $2, $3)', [user.id, 'daily_bonus', bonus]);

  const streakEmoji = streakDay >= 7 ? '🔥' : streakDay >= 3 ? '⚡' : '✨';
  await ctx.reply(
    `${streakEmoji} <b>Daily Bonus Claimed!</b>\n\n` +
    `💰 <b>+${bonus} points</b> added to your balance!\n` +
    `📅 Day streak: <b>${streakDay}</b> ${streakDay >= 7 ? '🔥 On fire!' : ''}\n` +
    `💵 Total points: <b>${user.points + bonus}</b>\n\n` +
    `Come back tomorrow for more! Keep your streak going for bigger bonuses!`,
    { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } }
  );
};

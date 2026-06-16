import { query } from '../../shared/db.js';
import logger from '../../shared/logger.js';

export const startCommand = async (ctx) => {
  try {
    const user = ctx.dbUser;
    const args = ctx.message?.text?.split(' ');
    const refCode = args?.[1];

    // Handle referral
    if (refCode && refCode.startsWith('REF') && user) {
      const referrerId = refCode.replace('REF', '');
      if (referrerId !== String(ctx.from.id)) {
        const { rows: refRows } = await query('SELECT id FROM users WHERE telegram_id = $1', [parseInt(referrerId)]);
        if (refRows[0] && !user.referred_by) {
          const referralPoints = parseInt(await query("SELECT value FROM settings WHERE key = 'referral_points'").then(r => r.rows[0]?.value || '50'));
          await query(
            'UPDATE users SET referred_by = $1, updated_at = NOW() WHERE id = $2',
            [refRows[0].id, user.id]
          );
          await query(
            'UPDATE users SET points = points + $1, referral_count = referral_count + 1, updated_at = NOW() WHERE id = $2',
            [referralPoints, refRows[0].id]
          );
          await query(
            'INSERT INTO referrals (referrer_id, referred_id, points_awarded, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [refRows[0].id, user.id, referralPoints, 'completed']
          );
          await query(
            'INSERT INTO user_rewards (user_id, reward_type, points_earned) VALUES ($1, $2, $3)',
            [refRows[0].id, 'referral', referralPoints]
          );
        }
      }
    }

    const { rows: settingRows } = await query("SELECT value FROM settings WHERE key = 'bot_welcome_message'");
    const welcomeMsg = settingRows[0]?.value || 'Welcome! 🚀';

    const keyboard = {
      inline_keyboard: [
        [{ text: '👤 My Profile', callback_data: 'profile' }, { text: '💰 Balance', callback_data: 'balance' }],
        [{ text: '🎁 Daily Bonus', callback_data: 'daily' }, { text: '🔗 Referral', callback_data: 'referral' }],
        [{ text: '🏆 Rewards', callback_data: 'rewards' }, { text: '📊 Stats', callback_data: 'user_stats' }],
        [{ text: '🎫 Support', callback_data: 'support' }, { text: '⚙️ Settings', callback_data: 'settings_menu' }],
      ],
    };

    const name = ctx.from.first_name || 'User';
    await ctx.reply(
      `${welcomeMsg}\n\nHello, <b>${name}</b>! 👋\n\n` +
      `📊 Your points: <b>${user?.points || 0}</b>\n` +
      `🔗 Referral code: <code>REF${ctx.from.id}</code>\n\n` +
      `Choose an option below:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  } catch (err) {
    logger.error(`Start command error: ${err.message}`);
    await ctx.reply('Welcome! An error occurred loading your profile.');
  }
};

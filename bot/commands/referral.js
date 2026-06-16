import { query } from '../../shared/db.js';

export const referralCommand = async (ctx) => {
  const user = ctx.dbUser;
  if (!user) return ctx.reply('❌ Please /start first.');

  const botUsername = ctx.botInfo?.username;
  const refLink = `https://t.me/${botUsername}?start=REF${user.telegram_id}`;

  const { rows: referralRows } = await query(
    `SELECT u.first_name, u.username, r.points_awarded, r.created_at
     FROM referrals r JOIN users u ON u.id = r.referred_id
     WHERE r.referrer_id = $1 ORDER BY r.created_at DESC LIMIT 10`,
    [user.id]
  );

  const { rows: settingRows } = await query("SELECT value FROM settings WHERE key = 'referral_points'");
  const refPoints = settingRows[0]?.value || '50';

  let referralList = referralRows.length > 0
    ? referralRows.map((r, i) => `${i + 1}. ${r.first_name}${r.username ? ` (@${r.username})` : ''} — +${r.points_awarded} pts`).join('\n')
    : 'No referrals yet. Share your link!';

  const text =
    `🔗 <b>Your Referral Program</b>\n\n` +
    `💰 <b>Earn ${refPoints} points</b> for each friend you invite!\n\n` +
    `🔗 <b>Your referral link:</b>\n<code>${refLink}</code>\n\n` +
    `👥 <b>Total referrals:</b> ${user.referral_count}\n` +
    `💎 <b>Total earned from referrals:</b> ${user.referral_count * parseInt(refPoints)} pts\n\n` +
    `<b>Recent referrals:</b>\n${referralList}`;

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📤 Share Link', url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Join and earn points!')}` }],
        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
      ],
    },
  });
};

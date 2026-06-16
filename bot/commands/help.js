export const helpCommand = async (ctx) => {
  const helpText = `
<b>📖 Social Poster Bot — Commands</b>

<b>👤 User Commands:</b>
/start — Main menu
/help — Show this help
/profile — Your profile
/balance — Check points balance
/referral — Your referral link & stats
/rewards — View available rewards
/daily — Claim daily bonus
/support — Open a support ticket
/settings — Your preferences
/stats — Global statistics

<b>🔧 How it works:</b>
• Earn points by inviting friends via your referral link
• Claim daily bonuses every 24 hours
• Use points to claim rewards
• Open tickets to get admin support

<b>📣 Stay updated:</b>
Subscribe to our channels to get the latest news and earn rewards!

<i>Need more help? Use /support to contact an admin.</i>
`;

  await ctx.reply(helpText, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
    },
  });
};

import { query } from '../../../shared/db.js';
import logger from '../../../shared/logger.js';

const broadcastState = new Map();

export const broadcastCommand = async (ctx) => {
  broadcastState.set(ctx.from.id, { step: 'awaiting_message' });
  await ctx.reply(
    '📢 <b>Broadcast Message</b>\n\n' +
    'Send the message you want to broadcast to ALL users.\n' +
    'Supports HTML formatting.\n\n' +
    'Type /cancel to abort.',
    { parse_mode: 'HTML', reply_markup: { force_reply: true } }
  );
};

export const handleBroadcastMessage = async (ctx) => {
  const state = broadcastState.get(ctx.from.id);
  if (!state) return false;

  if (ctx.message?.text === '/cancel') {
    broadcastState.delete(ctx.from.id);
    await ctx.reply('❌ Broadcast cancelled.');
    return true;
  }

  if (state.step === 'awaiting_message') {
    const message = ctx.message?.text || ctx.message?.caption || '';
    broadcastState.set(ctx.from.id, { step: 'confirming', message });
    await ctx.reply(
      `📋 <b>Confirm Broadcast:</b>\n\n${message}\n\n⚠️ This will be sent to ALL users. Confirm?`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Send', callback_data: 'confirm_broadcast' }, { text: '❌ Cancel', callback_data: 'cancel_broadcast' }],
          ],
        },
      }
    );
    return true;
  }
  return false;
};

export const executeBroadcast = async (ctx, bot) => {
  const state = broadcastState.get(ctx.from.id);
  if (!state?.message) return;

  broadcastState.delete(ctx.from.id);
  await ctx.editMessageText('📤 Sending broadcast...');

  const { rows: users } = await query('SELECT telegram_id FROM users WHERE is_banned = false');
  let sent = 0, failed = 0;

  for (const user of users) {
    try {
      await bot.telegram.sendMessage(user.telegram_id, state.message, { parse_mode: 'HTML' });
      sent++;
      if (sent % 20 === 0) await new Promise(r => setTimeout(r, 1000)); // Rate limit
    } catch {
      failed++;
    }
  }

  await query('INSERT INTO logs (level, message, service) VALUES ($1, $2, $3)', ['info', `Broadcast sent: ${sent} success, ${failed} failed`, 'bot']);
  await ctx.reply(`✅ Broadcast complete!\n\n✅ Sent: ${sent}\n❌ Failed: ${failed}`);
};

export const getBroadcastState = () => broadcastState;

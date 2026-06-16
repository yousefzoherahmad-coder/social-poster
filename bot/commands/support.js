import { query } from '../../shared/db.js';

const userSupportState = new Map();

export const supportCommand = async (ctx) => {
  await ctx.reply(
    `🎫 <b>Support Center</b>\n\nHow can we help you?\n\nChoose an option:`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Open New Ticket', callback_data: 'new_ticket' }],
          [{ text: '📋 My Tickets', callback_data: 'my_tickets' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
        ],
      },
    }
  );
};

export const handleNewTicket = async (ctx) => {
  userSupportState.set(ctx.from.id, { step: 'awaiting_subject' });
  await ctx.reply(
    '📝 <b>New Support Ticket</b>\n\nPlease describe your issue briefly (this will be the ticket subject):',
    { parse_mode: 'HTML', reply_markup: { force_reply: true } }
  );
};

export const handleMyTickets = async (ctx) => {
  const user = ctx.dbUser;
  const { rows } = await query(
    "SELECT id, subject, status, created_at FROM tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10",
    [user.id]
  );
  if (!rows.length) return ctx.reply('📋 You have no support tickets yet.\n\nUse /support to open a new one.');

  const list = rows.map(t =>
    `#${t.id} — ${t.status.toUpperCase()} — ${t.subject.slice(0, 40)}${t.subject.length > 40 ? '...' : ''}`
  ).join('\n');

  await ctx.reply(`📋 <b>Your Tickets:</b>\n\n${list}`, { parse_mode: 'HTML' });
};

export const handleSupportMessage = async (ctx) => {
  const state = userSupportState.get(ctx.from.id);
  if (!state) return false;

  const user = ctx.dbUser;
  if (state.step === 'awaiting_subject') {
    const subject = ctx.message.text;
    userSupportState.set(ctx.from.id, { step: 'awaiting_message', subject });
    await ctx.reply(
      `📝 Subject: <b>${subject}</b>\n\nNow please provide the details of your issue:`,
      { parse_mode: 'HTML', reply_markup: { force_reply: true } }
    );
    return true;
  }

  if (state.step === 'awaiting_message') {
    const message = ctx.message.text;
    const { rows: ticketRows } = await query(
      "INSERT INTO tickets (user_id, subject) VALUES ($1, $2) RETURNING id",
      [user.id, state.subject]
    );
    await query(
      "INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message) VALUES ($1, 'user', $2, $3)",
      [ticketRows[0].id, user.id, message]
    );
    userSupportState.delete(ctx.from.id);
    await ctx.reply(
      `✅ <b>Ticket #${ticketRows[0].id} created!</b>\n\nOur team will respond as soon as possible.\n\nThank you for your patience! 🙏`,
      { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } }
    );
    return true;
  }
  return false;
};

export const getSupportState = () => userSupportState;

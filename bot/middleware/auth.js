import { query } from '../../shared/db.js';
import logger from '../../shared/logger.js';

const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);

export const registerUser = async (ctx, next) => {
  try {
    const tgUser = ctx.from;
    if (!tgUser) return next();

    const { rows } = await query(
      `INSERT INTO users (telegram_id, username, first_name, last_name, language_code, referral_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (telegram_id) DO UPDATE
       SET username = EXCLUDED.username,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           last_active = NOW(),
           updated_at = NOW()
       RETURNING *`,
      [
        tgUser.id, tgUser.username || null, tgUser.first_name,
        tgUser.last_name || null, tgUser.language_code || 'en',
        `REF${tgUser.id}`,
      ]
    );
    ctx.dbUser = rows[0];
    next();
  } catch (err) {
    logger.error(`Bot auth error: ${err.message}`);
    next();
  }
};

export const requireNotBanned = async (ctx, next) => {
  if (ctx.dbUser?.is_banned) {
    return ctx.reply(`❌ You have been banned from using this bot.\nReason: ${ctx.dbUser.ban_reason || 'Violation of terms'}`);
  }
  next();
};

export const isAdmin = (telegramId) => {
  return ADMIN_IDS.includes(parseInt(telegramId));
};

export const requireAdmin = (ctx, next) => {
  if (!isAdmin(ctx.from?.id)) {
    return ctx.reply('❌ This command is for administrators only.');
  }
  next();
};

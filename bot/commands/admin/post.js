import { query } from '../../../shared/db.js';
import { publishPost, getAvailablePlatforms } from '../../../shared/poster.js';
import logger from '../../../shared/logger.js';

const postState = new Map();

export const adminCreatePostCommand = async (ctx) => {
  const platforms = getAvailablePlatforms();
  postState.set(ctx.from.id, { step: 'awaiting_content', platforms: [] });

  await ctx.reply(
    '📝 <b>Create New Post</b>\n\nSend the content for your post:\n\n<i>Supports text with HTML formatting</i>',
    { parse_mode: 'HTML', reply_markup: { force_reply: true } }
  );
};

export const handlePostCreation = async (ctx) => {
  const state = postState.get(ctx.from.id);
  if (!state) return false;

  if (state.step === 'awaiting_content') {
    const content = ctx.message?.text || ctx.message?.caption || '';
    if (!content) return false;

    const platforms = getAvailablePlatforms();
    const keyboard = platforms.map(p => [{ text: `☐ ${p}`, callback_data: `toggle_platform_${p}` }]);
    keyboard.push([{ text: '✅ Confirm Platforms', callback_data: 'confirm_platforms' }]);
    keyboard.push([{ text: '❌ Cancel', callback_data: 'cancel_post' }]);

    postState.set(ctx.from.id, { ...state, step: 'selecting_platforms', content, selectedPlatforms: [] });

    await ctx.reply(
      `📝 <b>Post content saved!</b>\n\nNow select the platforms to post to:`,
      { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } }
    );
    return true;
  }
  return false;
};

export const togglePlatform = async (ctx) => {
  const platform = ctx.callbackQuery?.data?.replace('toggle_platform_', '');
  const state = postState.get(ctx.from.id);
  if (!state) return;

  const selected = state.selectedPlatforms || [];
  const idx = selected.indexOf(platform);
  if (idx >= 0) selected.splice(idx, 1);
  else selected.push(platform);

  postState.set(ctx.from.id, { ...state, selectedPlatforms: selected });

  const platforms = getAvailablePlatforms();
  const keyboard = platforms.map(p => [{
    text: `${selected.includes(p) ? '✅' : '☐'} ${p}`,
    callback_data: `toggle_platform_${p}`,
  }]);
  keyboard.push([{ text: `✅ Confirm (${selected.length} selected)`, callback_data: 'confirm_platforms' }]);
  keyboard.push([{ text: '❌ Cancel', callback_data: 'cancel_post' }]);

  await ctx.editMessageReplyMarkup({ inline_keyboard: keyboard });
};

export const confirmPost = async (ctx) => {
  const state = postState.get(ctx.from.id);
  if (!state?.selectedPlatforms?.length) {
    return ctx.answerCbQuery('⚠️ Select at least one platform!', { show_alert: true });
  }

  const { rows } = await query(
    "INSERT INTO posts (content, platforms, status, created_by) VALUES ($1, $2, 'publishing', (SELECT id FROM admins LIMIT 1)) RETURNING *",
    [state.content, state.selectedPlatforms]
  );

  postState.delete(ctx.from.id);
  await ctx.editMessageText(`📤 Publishing to: ${state.selectedPlatforms.join(', ')}...`);

  try {
    const results = await publishPost(rows[0]);
    await query("UPDATE posts SET status = 'published', published_at = NOW(), results = $1 WHERE id = $2", [JSON.stringify(results), rows[0].id]);
    await ctx.reply(`✅ <b>Post published successfully!</b>\n\nPlatforms: ${state.selectedPlatforms.join(', ')}\nPost ID: #${rows[0].id}`, { parse_mode: 'HTML' });
  } catch (err) {
    await query("UPDATE posts SET status = 'failed', error_message = $1 WHERE id = $2", [err.message, rows[0].id]);
    logger.error(`Bot post publishing failed: ${err.message}`);
    await ctx.reply(`❌ <b>Publishing failed:</b>\n${err.message}\n\nPost saved as draft (ID: #${rows[0].id})`, { parse_mode: 'HTML' });
  }
};

export const getPostState = () => postState;

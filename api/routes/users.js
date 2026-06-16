import { Router } from 'express';
import { query } from '../../shared/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

/** @swagger
 * /api/users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, banned } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let i = 1;

    if (search) {
      conditions.push(`(username ILIKE $${i} OR first_name ILIKE $${i} OR last_name ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    if (banned !== undefined) {
      conditions.push(`is_banned = $${i}`);
      params.push(banned === 'true'); i++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRes = await query(`SELECT COUNT(*) FROM users ${where}`, params);
    const { rows } = await query(
      `SELECT id, telegram_id, username, first_name, last_name, points, is_banned, referral_code, referral_count, last_active, joined_at FROM users ${where} ORDER BY joined_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    res.json({ users: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/ban', async (req, res) => {
  try {
    const { reason } = req.body;
    await query('UPDATE users SET is_banned = true, ban_reason = $1, updated_at = NOW() WHERE id = $2', [reason || 'Banned by admin', req.params.id]);
    res.json({ message: 'User banned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/unban', async (req, res) => {
  try {
    await query('UPDATE users SET is_banned = false, ban_reason = NULL, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ message: 'User unbanned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/points', async (req, res) => {
  try {
    const { points, operation = 'add' } = req.body;
    const op = operation === 'subtract' ? '-' : '+';
    await query(`UPDATE users SET points = points ${op} $1, updated_at = NOW() WHERE id = $2`, [points, req.params.id]);
    res.json({ message: 'Points updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/rewards', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT ur.*, r.name FROM user_rewards ur LEFT JOIN rewards r ON r.id = ur.reward_id WHERE ur.user_id = $1 ORDER BY ur.claimed_at DESC',
      [req.params.id]
    );
    res.json({ rewards: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

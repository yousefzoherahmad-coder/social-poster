import { Router } from 'express';
import { query } from '../../shared/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { user_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const where = user_id ? 'WHERE user_id = $1' : '';
    const params = user_id ? [user_id, parseInt(limit), parseInt(offset)] : [parseInt(limit), parseInt(offset)];
    const { rows } = await query(
      `SELECT n.*, u.username, u.first_name FROM notifications n LEFT JOIN users u ON u.id = n.user_id ${where} ORDER BY n.created_at DESC LIMIT $${user_id ? 2 : 1} OFFSET $${user_id ? 3 : 2}`,
      params
    );
    res.json({ notifications: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/broadcast', async (req, res) => {
  try {
    const { title, message, type = 'announcement', user_ids } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    let targetUsers;
    if (user_ids?.length) {
      const { rows } = await query('SELECT id FROM users WHERE id = ANY($1) AND is_banned = false', [user_ids]);
      targetUsers = rows;
    } else {
      const { rows } = await query('SELECT id FROM users WHERE is_banned = false');
      targetUsers = rows;
    }
    let count = 0;
    for (const user of targetUsers) {
      await query(
        'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)',
        [user.id, type, title, message]
      );
      count++;
    }
    res.json({ message: `Notification sent to ${count} users`, count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

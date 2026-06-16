import { Router } from 'express';
import { query } from '../../shared/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM rewards ORDER BY created_at DESC');
    res.json({ rewards: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, reward_type, points_value, max_claims, expires_at } = req.body;
    if (!name || !reward_type) return res.status(400).json({ error: 'name and reward_type required' });
    const { rows } = await query(
      'INSERT INTO rewards (name, description, reward_type, points_value, max_claims, expires_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, description, reward_type, points_value || 0, max_claims || null, expires_at || null]
    );
    res.status(201).json({ reward: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, points_value, is_active, max_claims, expires_at } = req.body;
    const { rows } = await query(
      'UPDATE rewards SET name=$1, description=$2, points_value=$3, is_active=$4, max_claims=$5, expires_at=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, description, points_value, is_active, max_claims, expires_at, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Reward not found' });
    res.json({ reward: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM rewards WHERE id = $1', [req.params.id]);
    res.json({ message: 'Reward deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, telegram_id, username, first_name, points, referral_count FROM users WHERE is_banned = false ORDER BY points DESC LIMIT 50'
    );
    res.json({ leaderboard: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/daily-stats', async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT DATE(claimed_at) as date, COUNT(*) as claims, SUM(points_awarded) as total_points FROM daily_bonuses WHERE claimed_at > NOW() - INTERVAL '30 days' GROUP BY DATE(claimed_at) ORDER BY date DESC"
    );
    res.json({ stats: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

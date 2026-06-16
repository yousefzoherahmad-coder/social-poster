import { Router } from 'express';
import { query } from '../../shared/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM channels ORDER BY created_at DESC');
    res.json({ channels: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { platform, channel_id, channel_name, channel_url, description, is_force_sub } = req.body;
    if (!platform || !channel_name) return res.status(400).json({ error: 'platform and channel_name required' });
    const { rows } = await query(
      'INSERT INTO channels (platform, channel_id, channel_name, channel_url, description, is_force_sub, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [platform, channel_id, channel_name, channel_url, description, is_force_sub || false, req.admin.id]
    );
    res.status(201).json({ channel: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { channel_name, channel_url, description, is_active, is_force_sub } = req.body;
    const { rows } = await query(
      'UPDATE channels SET channel_name=$1, channel_url=$2, description=$3, is_active=$4, is_force_sub=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [channel_name, channel_url, description, is_active, is_force_sub, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Channel not found' });
    res.json({ channel: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM channels WHERE id = $1', [req.params.id]);
    res.json({ message: 'Channel deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/stats', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM channels WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Channel not found' });
    const postCount = await query("SELECT COUNT(*) FROM posts WHERE $1 = ANY(platforms)", [rows[0].platform]);
    res.json({ channel: rows[0], post_count: parseInt(postCount.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

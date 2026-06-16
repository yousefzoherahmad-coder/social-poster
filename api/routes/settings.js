import { Router } from 'express';
import { query } from '../../shared/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? 'WHERE category = $1' : '';
    const { rows } = await query(`SELECT * FROM settings ${where} ORDER BY category, key`, category ? [category] : []);
    const grouped = rows.reduce((acc, s) => {
      acc[s.category] = acc[s.category] || {};
      acc[s.category][s.key] = s.value;
      return acc;
    }, {});
    res.json({ settings: grouped, raw: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await query(
        'UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [String(value), key]
      );
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:key', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM settings WHERE key = $1', [req.params.key]);
    if (!rows[0]) return res.status(404).json({ error: 'Setting not found' });
    res.json({ setting: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { key, value, category, description } = req.body;
    if (!key) return res.status(400).json({ error: 'Key required' });
    const { rows } = await query(
      'INSERT INTO settings (key, value, category, description) VALUES ($1,$2,$3,$4) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW() RETURNING *',
      [key, String(value), category || 'general', description]
    );
    res.json({ setting: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

import { Router } from 'express';
import { query } from '../../shared/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { level, service, page = 1, limit = 100, from, to } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [], params = [], i = 1;
    if (level) { conditions.push(`level = $${i++}`); params.push(level); }
    if (service) { conditions.push(`service ILIKE $${i++}`); params.push(`%${service}%`); }
    if (from) { conditions.push(`created_at >= $${i++}`); params.push(from); }
    if (to) { conditions.push(`created_at <= $${i++}`); params.push(to); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await query(
      `SELECT * FROM logs ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const countRes = await query(`SELECT COUNT(*) FROM logs ${where}`, params);
    res.json({ logs: rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/clear', async (req, res) => {
  try {
    const { older_than_days = 30 } = req.body;
    const result = await query(
      'DELETE FROM logs WHERE created_at < NOW() - INTERVAL \'1 day\' * $1',
      [parseInt(older_than_days)]
    );
    res.json({ message: `Cleared ${result.rowCount} log entries` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

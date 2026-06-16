import { Router } from 'express';
import { query } from '../../shared/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = status ? 'WHERE t.status = $1' : '';
    const params = status ? [status, parseInt(limit), parseInt(offset)] : [parseInt(limit), parseInt(offset)];
    const i = status ? 4 : 3;
    const { rows } = await query(
      `SELECT t.*, u.username, u.first_name, u.last_name, u.telegram_id FROM tickets t LEFT JOIN users u ON u.id = t.user_id ${where} ORDER BY t.created_at DESC LIMIT $${status ? 2 : 1} OFFSET $${status ? 3 : 2}`,
      params
    );
    const countRes = await query(`SELECT COUNT(*) FROM tickets t ${where}`, status ? [status] : []);
    res.json({ tickets: rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT t.*, u.username, u.first_name, u.telegram_id FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Ticket not found' });
    const msgs = await query('SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC', [req.params.id]);
    res.json({ ticket: rows[0], messages: msgs.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/reply', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const { rows } = await query(
      'INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, 'admin', req.admin.id, message]
    );
    await query("UPDATE tickets SET updated_at = NOW(), status = CASE WHEN status = 'closed' THEN 'open' ELSE status END WHERE id = $1", [req.params.id]);
    res.status(201).json({ message: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status, priority } = req.body;
    const closedAt = status === 'closed' ? 'NOW()' : 'NULL';
    const { rows } = await query(
      `UPDATE tickets SET status = $1, priority = COALESCE($2, priority), closed_at = ${closedAt}, assigned_to = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
      [status, priority || null, req.admin.id, req.params.id]
    );
    res.json({ ticket: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

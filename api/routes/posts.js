import { Router } from 'express';
import { query } from '../../shared/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { publishPost } from '../../shared/poster.js';
import logger from '../../shared/logger.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, platform } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [], params = [], i = 1;
    if (status) { conditions.push(`status = $${i++}`); params.push(status); }
    if (platform) { conditions.push(`$${i++} = ANY(platforms)`); params.push(platform); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRes = await query(`SELECT COUNT(*) FROM posts ${where}`, params);
    const { rows } = await query(
      `SELECT p.*, a.username as created_by_name FROM posts p LEFT JOIN admins a ON a.id = p.created_by ${where} ORDER BY p.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    res.json({ posts: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json({ post: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', upload.single('media'), async (req, res) => {
  try {
    const { content, title, link, platforms, scheduled_at, tags } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const platformsArr = typeof platforms === 'string' ? platforms.split(',') : (platforms || []);
    const tagsArr = typeof tags === 'string' ? tags.split(',') : (tags || []);
    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const mediaType = req.file ? req.file.mimetype.split('/')[0] : null;
    const status = scheduled_at ? 'scheduled' : 'draft';

    const { rows } = await query(
      'INSERT INTO posts (title, content, link, platforms, media_url, media_type, scheduled_at, status, tags, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [title, content, link, platformsArr, mediaUrl, mediaType, scheduled_at || null, status, tagsArr, req.admin.id]
    );
    res.status(201).json({ post: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/publish', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    const post = rows[0];
    await query("UPDATE posts SET status = 'publishing' WHERE id = $1", [post.id]);
    try {
      const results = await publishPost(post);
      await query(
        "UPDATE posts SET status = 'published', published_at = NOW(), results = $1 WHERE id = $2",
        [JSON.stringify(results), post.id]
      );
      res.json({ message: 'Post published successfully', results });
    } catch (err) {
      await query("UPDATE posts SET status = 'failed', error_message = $1 WHERE id = $2", [err.message, post.id]);
      res.status(500).json({ error: `Publishing failed: ${err.message}` });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', upload.single('media'), async (req, res) => {
  try {
    const { content, title, link, platforms, scheduled_at, tags, status } = req.body;
    const platformsArr = typeof platforms === 'string' ? platforms.split(',') : (platforms || []);
    const tagsArr = typeof tags === 'string' ? tags.split(',') : (tags || []);
    const { rows } = await query(
      'UPDATE posts SET title=$1, content=$2, link=$3, platforms=$4, scheduled_at=$5, tags=$6, status=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [title, content, link, platformsArr, scheduled_at || null, tagsArr, status || 'draft', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json({ post: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

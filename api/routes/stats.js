import { Router } from 'express';
import { query } from '../../shared/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/overview', async (req, res) => {
  try {
    const [users, channels, posts, tickets, activeUsers, newUsersToday, publishedPosts] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM channels WHERE is_active = true'),
      query('SELECT COUNT(*) FROM posts'),
      query("SELECT COUNT(*) FROM tickets WHERE status = 'open'"),
      query("SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL '24 hours'"),
      query("SELECT COUNT(*) FROM users WHERE joined_at > NOW() - INTERVAL '24 hours'"),
      query("SELECT COUNT(*) FROM posts WHERE status = 'published'"),
    ]);
    res.json({
      total_users: parseInt(users.rows[0].count),
      active_channels: parseInt(channels.rows[0].count),
      total_posts: parseInt(posts.rows[0].count),
      open_tickets: parseInt(tickets.rows[0].count),
      active_users_24h: parseInt(activeUsers.rows[0].count),
      new_users_today: parseInt(newUsersToday.rows[0].count),
      published_posts: parseInt(publishedPosts.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users-growth', async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT DATE(joined_at) as date, COUNT(*) as count FROM users WHERE joined_at > NOW() - INTERVAL '30 days' GROUP BY DATE(joined_at) ORDER BY date"
    );
    res.json({ growth: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/posts-by-platform', async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT unnest(platforms) as platform, COUNT(*) as count FROM posts WHERE status = 'published' GROUP BY platform ORDER BY count DESC"
    );
    res.json({ platforms: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/posts-timeline', async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT DATE(published_at) as date, COUNT(*) as count FROM posts WHERE status = 'published' AND published_at > NOW() - INTERVAL '30 days' GROUP BY DATE(published_at) ORDER BY date"
    );
    res.json({ timeline: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/rewards-summary', async (req, res) => {
  try {
    const [totalPoints, dailyClaims, referralCount] = await Promise.all([
      query('SELECT SUM(points) as total FROM users'),
      query("SELECT COUNT(*) FROM daily_bonuses WHERE claimed_at > NOW() - INTERVAL '24 hours'"),
      query("SELECT COUNT(*) FROM referrals WHERE status = 'completed'"),
    ]);
    res.json({
      total_points_distributed: parseInt(totalPoints.rows[0].total) || 0,
      daily_claims_24h: parseInt(dailyClaims.rows[0].count),
      total_referrals: parseInt(referralCount.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

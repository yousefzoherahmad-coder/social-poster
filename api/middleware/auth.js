import jwt from 'jsonwebtoken';
import { query } from '../../shared/db.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-me');
    const { rows } = await query('SELECT id, username, email, role, is_active FROM admins WHERE id = $1', [decoded.id]);
    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({ error: 'Invalid or inactive account' });
    }
    req.admin = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.admin?.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

export const generateToken = (admin) => {
  return jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    process.env.JWT_SECRET || 'fallback-secret-change-me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

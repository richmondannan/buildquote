import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { pool } from '../db.js';
dotenv.config();
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid token' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}
export async function requireRole(role) {
  return async function (req, res, next) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: 'unauthenticated' });
      const r = await pool.query('SELECT id, role, company_id FROM users WHERE id=$1', [userId]);
      const user = r.rows[0];
      if (!user) return res.status(401).json({ error: 'user not found' });
      if (user.role !== role && user.role !== 'superadmin') return res.status(403).json({ error: 'forbidden' });
      req.currentUser = user;
      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'server error' });
    }
  };
}

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import dotenv from 'dotenv';
dotenv.config();
const router = express.Router();
router.post('/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email+password required' });
  const hash = await bcrypt.hash(password, 10);
  const r = await pool.query('INSERT INTO users (email,password_hash,name,phone) VALUES ($1,$2,$3,$4) RETURNING id,email,name', [email, hash, name, phone]);
  res.json(r.rows[0]);
});
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  const user = r.rows[0];
  if (!user) return res.status(401).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid' });
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});
export default router;

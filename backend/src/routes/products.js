import express from 'express';
import { pool } from '../db.js';
const router = express.Router();
router.get('/', async (req, res) => {
  const { q, company_id, min_price, max_price } = req.query;
  let sql = 'SELECT p.*, c.name as company_name, p.company_id FROM products p LEFT JOIN companies c ON p.company_id=c.id WHERE p.active=true';
  const params = [];
  if (q) { params.push('%' + q.toLowerCase() + '%'); sql += ` AND lower(p.name) LIKE $${params.length}`; }
  if (company_id) { params.push(company_id); sql += ` AND p.company_id=$${params.length}`; }
  if (min_price) { params.push(min_price); sql += ` AND p.unit_price >= $${params.length}`; }
  if (max_price) { params.push(max_price); sql += ` AND p.unit_price <= $${params.length}`; }
  sql += ' ORDER BY p.name LIMIT 200';
  const r = await pool.query(sql, params);
  res.json(r.rows);
});
export default router;

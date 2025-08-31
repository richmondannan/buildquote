import express from 'express';
import { pool } from '../db.js';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.post('/', async (req, res) => {
  const { name, contact_email, phone, reg_number } = req.body;
  const r = await pool.query('INSERT INTO companies (name, contact_email, phone, reg_number) VALUES ($1,$2,$3,$4) RETURNING id,name', [name, contact_email, phone, reg_number]);
  res.json(r.rows[0]);
});
router.get('/:id', async (req, res) => {
  const r = await pool.query('SELECT * FROM companies WHERE id=$1', [req.params.id]);
  if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
  res.json(r.rows[0]);
});
router.post('/:companyId/products', requireAuth, requireRole('company_admin'), async (req, res) => {
  const { companyId } = req.params;
  if (req.currentUser.company_id !== companyId && req.currentUser.role !== 'superadmin') return res.status(403).json({ error: 'forbidden' });
  const { sku, name, description, unit, unit_price, stock, images } = req.body;
  if (!name || !unit || unit_price == null) return res.status(400).json({ error: 'name, unit and unit_price required' });
  const r = await pool.query('INSERT INTO products (company_id, sku, name, description, unit, unit_price, stock, product_images) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name', [companyId, sku || null, name, description || null, unit, unit_price, stock || 0, JSON.stringify(images || [])]);
  res.json(r.rows[0]);
});
router.post('/:companyId/products/bulk', requireAuth, requireRole('company_admin'), upload.single('file'), async (req, res) => {
  const { companyId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'file required' });
  try {
    const text = req.file.buffer.toString('utf8');
    const records = parse(text, { columns: true, skip_empty_lines: true });
    const inserted = [];
    const errors = [];
    for (const [i, row] of records.entries()) {
      try {
        const name = (row.name || '').trim();
        const unit = (row.unit || '').trim();
        const unit_price = parseFloat((row.unit_price || '0').replace(/[^0-9.-]+/g, '')) || 0;
        const sku = (row.sku || null);
        const description = row.description || null;
        const stock = parseInt(row.stock || '0') || 0;
        const images = row.images ? row.images.split('|').map(s => s.trim()).filter(Boolean) : [];
        if (!name || !unit || unit_price <= 0) {
          errors.push({ line: i+2, reason: 'invalid required fields', raw: row });
          continue;
        }
        const r = await pool.query('INSERT INTO products (company_id, sku, name, description, unit, unit_price, stock, product_images) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name', [companyId, sku, name, description, unit, unit_price, stock, JSON.stringify(images)]);
        inserted.push(r.rows[0]);
      } catch (e) { errors.push({ line: i+2, reason: e.message, raw: row }); }
    }
    res.json({ insertedCount: inserted.length, inserted, errors });
  } catch (err) {
    console.error('CSV parse error', err.message);
    res.status(400).json({ error: 'invalid csv', reason: err.message });
  }
});
export default router;

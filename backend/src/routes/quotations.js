import express from 'express';
import { pool } from '../db.js';
const router = express.Router();
router.post('/', async (req, res) => {
  const { buyerId, companyId, items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'items required' });
  const productIds = items.map(i => i.productId);
  const { rows } = await pool.query('SELECT id, unit_price FROM products WHERE id = ANY($1::uuid[])', [productIds]);
  const priceMap = Object.fromEntries(rows.map(r => [r.id, r.unit_price]));
  let subtotal = 0;
  for (const it of items) subtotal += (priceMap[it.productId] || 0) * it.qty;
  const vat = +(subtotal * 0.12).toFixed(2);
  const total = +(subtotal + vat).toFixed(2);
  const q = await pool.query('INSERT INTO quotations (buyer_id, company_id, subtotal, vat, total, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [buyerId, companyId, subtotal, vat, total, 'requested']);
  const quotationId = q.rows[0].id;
  for (const it of items) {
    await pool.query('INSERT INTO quotation_items (quotation_id, product_id, unit_price, qty, line_total) VALUES ($1,$2,$3,$4,$5)', [quotationId, it.productId, priceMap[it.productId] || 0, it.qty, (priceMap[it.productId] || 0) * it.qty]);
  }
  res.json({ id: quotationId, subtotal, vat, total });
});
router.post('/:id/request-discount', async (req, res) => {
  const id = req.params.id;
  const { buyerId, requestedPct } = req.body;
  await pool.query('UPDATE quotations SET requested_discount_pct=$1, status=$2 WHERE id=$3', [requestedPct, 'requested', id]);
  await pool.query('INSERT INTO negotiations (quotation_id, initiator_id, request_pct) VALUES ($1,$2,$3)', [id, buyerId, requestedPct]);
  res.json({ ok: true });
});
router.post('/:id/company-decision', async (req, res) => {
  const id = req.params.id;
  const { decision, approved_pct, counter_pct, companyId, note } = req.body;
  const q = await pool.query('SELECT subtotal FROM quotations WHERE id=$1', [id]);
  const subtotal = q.rows[0].subtotal;
  if (decision === 'approved') {
    const discount = +(subtotal * (approved_pct/100)).toFixed(2);
    const vat = +((subtotal - discount) * 0.12).toFixed(2);
    const total = +(subtotal - discount + vat).toFixed(2);
    await pool.query('UPDATE quotations SET approved_discount_pct=$1, vat=$2, total=$3, status=$4 WHERE id=$5', [approved_pct, vat, total, 'company_approved', id]);
    await pool.query('INSERT INTO negotiations (quotation_id, initiator_id, request_pct, company_response, company_counter_pct, note) VALUES ($1,$2,$3,$4,$5,$6)', [id, companyId, null, 'approved', approved_pct, note || null]);
    return res.json({ ok: true, total });
  }
  if (decision === 'rejected') {
    await pool.query('UPDATE quotations SET approved_discount_pct=0, status=$1 WHERE id=$2', ['company_rejected', id]);
    await pool.query('INSERT INTO negotiations (quotation_id, initiator_id, request_pct, company_response, note) VALUES ($1,$2,$3,$4,$5)', [id, companyId, null, 'rejected', note || null]);
    return res.json({ ok: true });
  }
  if (decision === 'counter') {
    const pct = Number(counter_pct || 0);
    const discount = +(subtotal * (pct/100)).toFixed(2);
    const vat = +((subtotal - discount) * 0.12).toFixed(2);
    const total = +(subtotal - discount + vat).toFixed(2);
    await pool.query('UPDATE quotations SET approved_discount_pct=$1, vat=$2, total=$3, status=$4 WHERE id=$5', [pct, vat, total, 'company_approved', id]);
    await pool.query('INSERT INTO negotiations (quotation_id, initiator_id, company_response, company_counter_pct, note) VALUES ($1,$2,$3,$4,$5)', [id, companyId, 'counter', pct, note || null]);
    return res.json({ ok: true, total });
  }
  res.status(400).json({ error: 'invalid decision' });
});
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const q = await pool.query('SELECT * FROM quotations WHERE id=$1', [id]);
  if (q.rows.length === 0) return res.status(404).json({ error: 'not found' });
  const quote = q.rows[0];
  const items = (await pool.query('SELECT qi.*, p.name, p.unit FROM quotation_items qi LEFT JOIN products p ON qi.product_id=p.id WHERE qi.quotation_id=$1', [id])).rows;
  res.json({ quote, items });
});
export default router;

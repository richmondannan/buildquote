import express from 'express';
import { pool } from '../db.js';
import dotenv from 'dotenv';
import { createPaymentOrange, createPaymentSmega, createStripeSession } from '../utils/paymentAdapters.js';
import { createPresignedUpload } from '../utils/s3.js';
dotenv.config();
const router = express.Router();
router.post('/create', async (req, res) => {
  const { quotationId, provider } = req.body;
  const q = await pool.query('SELECT * FROM quotations WHERE id=$1', [quotationId]);
  if (q.rows.length === 0) return res.status(404).json({ error: 'quotation not found' });
  const quote = q.rows[0];
  if (provider === 'stripe') {
    const session = await createStripeSession(quote);
    await pool.query('INSERT INTO transactions (quotation_id, provider, provider_ref, amount, currency, status) VALUES ($1,$2,$3,$4,$5,$6)', [quotationId, 'stripe', session.id, quote.total, 'BWP', 'pending']);
    return res.json({ url: session.url, sessionId: session.id });
  }
  if (provider === 'orange') {
    const resp = await createPaymentOrange(quote);
    await pool.query('INSERT INTO transactions (quotation_id, provider, provider_ref, amount, currency, status) VALUES ($1,$2,$3,$4,$5,$6)', [quotationId, 'orange', resp.requestId, quote.total, 'BWP', 'pending']);
    return res.json(resp);
  }
  if (provider === 'smega') {
    const resp = await createPaymentSmega(quote);
    await pool.query('INSERT INTO transactions (quotation_id, provider, provider_ref, amount, currency, status) VALUES ($1,$2,$3,$4,$5,$6)', [quotationId, 'smega', resp.ref, quote.total, 'BWP', 'pending']);
    return res.json(resp);
  }
  res.status(400).json({ error: 'unsupported provider' });
});
router.get('/presign', async (req, res) => {
  const { key, contentType } = req.query;
  if (!key) return res.status(400).json({ error: 'key required' });
  try {
    const url = await createPresignedUpload(key, contentType || 'image/jpeg');
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'presign failed' });
  }
});
export default router;

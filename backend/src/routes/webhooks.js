import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { pool } from '../db.js';
dotenv.config();
const stripe = Stripe(process.env.STRIPE_SECRET || '');
const router = express.Router();
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};
      const quotationId = meta.quotationId;
      await pool.query("UPDATE transactions SET status='completed' WHERE provider='stripe' AND provider_ref=$1", [session.id]);
      await pool.query("UPDATE quotations SET status='paid' WHERE id=$1", [quotationId]);
    }
    res.json({ received: true });
  } catch (err) {
    console.error('stripe webhook err', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
router.post('/mock/:provider', express.json(), async (req, res) => {
  const { provider } = req.params;
  const { provider_ref, status, quotationId } = req.body;
  await pool.query('UPDATE transactions SET status=$1 WHERE provider=$2 AND provider_ref=$3', [status, provider, provider_ref]);
  if (status === 'completed') await pool.query('UPDATE quotations SET status=$1 WHERE id=$2', ['paid', quotationId]);
  res.json({ ok: true });
});
export default router;

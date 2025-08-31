import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();
const stripe = Stripe(process.env.STRIPE_SECRET || '');
export async function createStripeSession(quote) {
  const amountUsd = Math.round(((quote.total || 0) / (process.env.BWP_TO_USD_RATE || 13)) * 100);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Quotation ' + quote.id }, unit_amount: amountUsd }, quantity: 1 }],
    mode: 'payment',
    success_url: process.env.SUCCESS_URL || 'https://example.com/success',
    cancel_url: process.env.CANCEL_URL || 'https://example.com/cancel',
    metadata: { quotationId: quote.id }
  });
  return session;
}
export async function createPaymentOrange(quote) {
  return { requestId: 'orange_req_' + Date.now(), paymentUrl: process.env.ORANGE_SANDBOX_URL || 'https://sandbox.orange.local/pay' };
}
export async function createPaymentSmega(quote) {
  return { ref: 'smega_' + Date.now(), paymentUrl: process.env.SMEGA_SANDBOX_URL || 'https://sandbox.smega.local/pay' };
}

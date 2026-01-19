import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { db } from './_lib/db';

// Vercel config to allow raw body access
export const config = {
    api: {
        bodyParser: false,
    },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-12-15.clover',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

async function getRawBody(readable: any): Promise<Buffer> {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
        const rawBody = await getRawBody(req);
        event = stripe.webhooks.constructEvent(rawBody, sig as string, endpointSecret);
    } catch (err: any) {
        console.error(`[WEBHOOK] Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        console.log(`[WEBHOOK] Received event: ${event.type}`);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const { request_id, product_type } = session.metadata || {};

            if (!request_id) {
                return res.status(200).json({ received: true, info: 'No request_id' });
            }

            // Idempotency: check if already paid
            const order = await db.getOrderByRequestId(request_id);
            if (order?.status === 'paid') {
                return res.status(200).json({ received: true, info: 'Already processed' });
            }

            let fulfillmentStatus = 'paid_resume_text';
            if (product_type === 'resume_text') fulfillmentStatus = 'paid_resume_text';
            if (product_type === 'resume_1on1') fulfillmentStatus = 'paid_1on1';
            if (product_type === 'premium_coaching') fulfillmentStatus = 'paid_premium_coaching';

            await db.updateOrderByRequestId(request_id, {
                payment_status: 'paid',
                stripe_payment_intent_id: session.payment_intent as string,
                fulfillment_status: fulfillmentStatus,
            });

            console.log(`[WEBHOOK] Order ${request_id} marked as paid`);

        } else if (event.type === 'payment_intent.payment_failed') {
            const pi = event.data.object as Stripe.PaymentIntent;
            const { request_id } = pi.metadata || {};

            if (request_id) {
                await db.updateOrderByRequestId(request_id, { payment_status: 'failed' });
            }
        } else if (event.type === 'charge.refunded') {
            const charge = event.data.object as Stripe.Charge;
            if (charge.payment_intent) {
                await db.updateOrderByPaymentIntentId(charge.payment_intent as string, {
                    payment_status: 'refunded',
                });
            }
        }

        return res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('[WEBHOOK] Process error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

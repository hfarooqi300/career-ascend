import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { db } from './_lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    // Remove explicit apiVersion to use the account's default or let the SDK handle it
    // apiVersion: '2025-12-15.clover', 
});

const PRICE_IDS: Record<string, string> = {
    resume_text: 'price_1SqDiqPeJlf5mYezKmay87vL',
    premium_coaching: 'price_1SqDj2PeJlf5mYez4G7CMDKL',
    resume_1on1: 'price_1SqDiqPeJlf5mYezKmay87vL',
};

const TIER_MAPPING: Record<string, string> = {
    text_review: 'resume_text',
    coaching: 'premium_coaching',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[CREATE-CHECKOUT] Request received:', req.method);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { tier, email, fullName } = req.body || {};
        console.log('[CREATE-CHECKOUT] Payload:', { tier, email, fullName });

        if (!tier || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const productType = TIER_MAPPING[tier] || tier;
        const priceId = PRICE_IDS[productType];

        if (!priceId) {
            return res.status(400).json({ error: `Invalid product type: ${productType}` });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('[CREATE-CHECKOUT] CRITICAL: Missing STRIPE_SECRET_KEY');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const requestId = uuidv4();
        console.log('[CREATE-CHECKOUT] Creating order in DB:', requestId);

        try {
            // Create record in DB first
            await db.createOrder({
                request_id: requestId,
                email,
                full_name: fullName || 'Anonymous',
                tier: tier,
                product_type: productType,
                payment_status: 'pending',
                amount_cents: productType === 'resume_text' ? 9900 : 29900,
            });
        } catch (dbError: any) {
            console.error('[CREATE-CHECKOUT] DB Error:', dbError.message);
            return res.status(500).json({ error: `Database error: ${dbError.message}` });
        }

        const origin = req.headers.origin || 'http://localhost:5173';
        console.log('[CREATE-CHECKOUT] Creating Stripe session');

        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'payment',
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&request_id=${requestId}`,
            cancel_url: `${origin}/checkout?canceled=true`,
            metadata: {
                request_id: requestId,
                product_type: productType,
                email,
            },
        });

        console.log('[CREATE-CHECKOUT] Updating order with session ID:', session.id);
        await db.updateOrderByRequestId(requestId, {
            stripe_session_id: session.id,
        });

        return res.status(200).json({ url: session.url, requestId });
    } catch (error: any) {
        console.error('[CREATE-CHECKOUT] Global Error:', error.message, error.stack);
        return res.status(500).json({ error: error.message || 'An internal server error occurred' });
    }
}

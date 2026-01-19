import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { db } from './_lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-12-15.clover',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { sessionId, requestId } = req.body;

        if (!sessionId && !requestId) {
            return res.status(400).json({ error: 'Missing sessionId or requestId' });
        }

        // 1. Check DB first (Fastest / Source of Truth)
        // Preference: requestId if provided
        let order = null;
        if (requestId) {
            order = await db.getOrderByRequestId(requestId);
        }

        if (order?.status === 'paid') {
            return res.status(200).json({
                success: true,
                order,
                paymentStatus: 'paid',
            });
        }

        // 2. Fallback: Check Stripe if DB not updated yet
        // READ-ONLY: We do NOT update the DB here. Webhook must do it.
        if (sessionId) {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status === 'paid') {
                return res.status(200).json({
                    success: true,
                    order: order || { id: requestId, status: 'pending' },
                    paymentStatus: 'paid',
                });
            }

            return res.status(200).json({
                success: false,
                paymentStatus: session.payment_status,
                message: 'Payment not completed or webhook not yet arrived',
            });
        }

        return res.status(200).json({ success: false, message: 'Order pending' });

    } catch (error: any) {
        console.error('[VERIFY-PAYMENT] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

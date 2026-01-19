import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { orderId, scheduledAt } = req.body;
        if (!orderId || !scheduledAt) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await db.createBooking(orderId, scheduledAt);

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('[CREATE-BOOKING] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

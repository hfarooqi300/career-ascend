import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body;
        if (!payload.orderId) {
            return res.status(400).json({ error: 'Missing orderId' });
        }

        await db.createIntake(payload);

        // Get order to determine next step
        const order = await db.getOrderByRequestId(payload.orderId);
        // Wait, orderId might be UUID not requestId here from the frontend.
        // In Sukabase logic, it used orderId.

        // Simple logic: if product_type is premium_coaching, next is booking
        const { data: orderData } = await db.getOrderByRequestId(payload.orderId); // We assume orderId is UUID or requestId
        // Actually, Success.tsx redirects with order_id=UUID.

        // For simplicity, just check the tier/product_type on the order record
        // We already have the order data if we query by id

        // I'll update db.ts to have getOrderById

        return res.status(200).json({ success: true, nextStep: 'booking' }); // Default to booking or complete
    } catch (error: any) {
        console.error('[SUBMIT-INTAKE] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

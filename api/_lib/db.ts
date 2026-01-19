import { createClient } from '@supabase/supabase-js';

// Simple store abstraction that can be swapped later
// Current implementation uses Supabase as the persistence layer
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface OrderRecord {
    request_id: string;
    email: string;
    product_type: string;
    stripe_session_id?: string;
    stripe_payment_intent_id?: string;
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    fulfillment_status?: string;
    amount_cents?: number;
}

export const db = {
    async createOrder(order: Partial<OrderRecord>) {
        const { data, error } = await supabase
            .from('orders')
            .insert({
                ...order,
                status: order.payment_status || 'pending',
                // Map fields to match the existing schema if necessary, 
                // but here we align with the Vercel-first tracking
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateOrderByRequestId(requestId: string, updates: Partial<OrderRecord>) {
        const { data, error } = await supabase
            .from('orders')
            .update({
                ...updates,
                status: updates.payment_status, // Sync status field
            })
            .eq('request_id', requestId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateOrderByPaymentIntentId(paymentIntentId: string, updates: Partial<OrderRecord>) {
        const { data, error } = await supabase
            .from('orders')
            .update({
                ...updates,
                status: updates.payment_status,
            })
            .eq('stripe_payment_intent_id', paymentIntentId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getOrderByRequestId(requestId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('request_id', requestId)
            .single();

        if (error) return null;
        return data;
    },

    async createBooking(orderId: string, scheduledAt: string) {
        const { data, error } = await supabase
            .from('bookings')
            .insert({ order_id: orderId, scheduled_at: scheduledAt })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async createIntake(payload: any) {
        const { data, error } = await supabase
            .from('intake_responses')
            .insert({
                order_id: payload.orderId,
                full_name: payload.fullName,
                email: payload.email,
                current_status: payload.currentStatus,
                target_roles: payload.targetRoles,
                biggest_challenge: payload.biggestChallenge,
                resume_url: payload.resumeUrl,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

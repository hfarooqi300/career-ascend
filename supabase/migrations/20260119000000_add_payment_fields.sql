-- Create enum for product_type (mapping from legacy tiers + new types)
CREATE TYPE public.product_type AS ENUM ('resume_text', 'resume_1on1', 'premium_coaching');

-- Alter orders table to add new fields
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS request_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS product_type public.product_type,
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT CHECK (fulfillment_status IN ('paid_resume_text', 'paid_1on1', 'paid_premium_coaching')),
ADD CONSTRAINT request_id_unique UNIQUE (request_id);

-- Update status enum if necessary (Supabase enums are hard to alter directly in some versions, 
-- but we can just use the text values if it was a check constraint. 
-- The previous migration showed it was an ENUM 'order_status'. 
-- We need to add 'failed' and 'refunded' if not present.
-- Postgres ENUM modification:
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'refunded';

-- Backfill product_type based on legacy tier if needed
-- 'text_review' -> 'resume_text'
-- 'coaching' -> 'premium_coaching'
UPDATE public.orders 
SET product_type = 'resume_text' 
WHERE tier = 'text_review' AND product_type IS NULL;

UPDATE public.orders 
SET product_type = 'premium_coaching' 
WHERE tier = 'coaching' AND product_type IS NULL;

-- Make product_type required for future inserts (optional, maybe keep nullable for strict backward compat until fully migrated, but requirements say "NO placeholders")
-- We'll leave it nullable relative to existing 'tier' for safety during deployment, 
-- but application logic will enforce it.

-- Add indexes for lookups
CREATE INDEX IF NOT EXISTS idx_orders_request_id ON public.orders(request_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON public.orders(stripe_session_id);

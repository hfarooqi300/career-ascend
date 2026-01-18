-- Update orders status enum to include new statuses
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'booked';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'intake_complete';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'complete';
-- Instant Quotations Enhancement
-- Allows creating quotations for new/raw inquiries before they are registered as full customers

-- 1. Make customer_id nullable in quotations
ALTER TABLE public.quotations 
ALTER COLUMN customer_id DROP NOT NULL;

-- 2. Add raw customer info columns and fix base_rate_usd default
ALTER TABLE public.quotations 
ALTER COLUMN base_rate_usd SET DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_name_raw text,
ADD COLUMN IF NOT EXISTS customer_email text,
ADD COLUMN IF NOT EXISTS customer_phone text;

-- 3. Copy existing customer data for consistency (optional but good)
-- (No-op if table is empty)

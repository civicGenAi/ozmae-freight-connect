-- CRM Simplification Migration
-- Replaces multiple rate fields with a single 'rate' and removes agent tracking from leads

-- 1. Remove old columns and add single rate column to LEADS
ALTER TABLE public.leads 
DROP COLUMN IF EXISTS buy_rate_usd,
DROP COLUMN IF EXISTS sell_rate_usd,
DROP COLUMN IF EXISTS agent_name;

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS rate_usd numeric(12,2) DEFAULT 0;

-- 2. Add an upload_date column to RATE_CARD for tracking bulk imports
ALTER TABLE public.rate_card 
ADD COLUMN IF NOT EXISTS import_date timestamp with time zone DEFAULT now();

-- 3. Ensure Agent Library table has all necessary fields for Excel mapping
-- (Just in case they weren't added in the previous migration)
ALTER TABLE public.rate_card
ADD COLUMN IF NOT EXISTS agent_name text DEFAULT 'Generic Agent',
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Tanzania',
ADD COLUMN IF NOT EXISTS agent_email text,
ADD COLUMN IF NOT EXISTS agent_phone text,
ADD COLUMN IF NOT EXISTS agent_category text DEFAULT 'Freight Agent';

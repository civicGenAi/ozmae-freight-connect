-- CRM & Agent Library Enhancment Migration
-- Adds manual rates to leads and contact details/country to rate_card (Agent Library)

-- Update LEADS Table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS buy_rate_usd numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sell_rate_usd numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_name text;

-- Update RATE_CARD (Agent Library) Table
ALTER TABLE public.rate_card
ADD COLUMN IF NOT EXISTS agent_name text DEFAULT 'Generic Agent',
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Tanzania',
ADD COLUMN IF NOT EXISTS agent_email text,
ADD COLUMN IF NOT EXISTS agent_phone text,
ADD COLUMN IF NOT EXISTS agent_category text DEFAULT 'Freight Agent';

-- Add index for country-based search and categorization
CREATE INDEX IF NOT EXISTS idx_rate_card_country ON public.rate_card(country);
CREATE INDEX IF NOT EXISTS idx_rate_card_agent ON public.rate_card(agent_name);

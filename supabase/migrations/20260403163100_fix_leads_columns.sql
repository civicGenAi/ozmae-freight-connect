-- Fix Missing Columns in LEADS Table
-- Adding contact details directly to leads for quick inquiry management

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text;

-- Optional: Add index for search capability
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

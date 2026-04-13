-- Add transport_mode to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS transport_mode text CHECK (transport_mode IN ('air', 'sea', 'road'));

-- Add transport_mode to quotations table
ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS transport_mode text CHECK (transport_mode IN ('air', 'sea', 'road'));

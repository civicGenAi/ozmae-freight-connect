-- Add export-specific logistics fields to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS logistics_carrier text,
ADD COLUMN IF NOT EXISTS logistics_transit text,
ADD COLUMN IF NOT EXISTS logistics_extra text;

-- Add movement_type to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS movement_type text;

-- Add movement_type to quotations table
ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS movement_type text;


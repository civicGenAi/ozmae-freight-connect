-- Add operational expanding fields to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS commodity text,
  ADD COLUMN IF NOT EXISTS validity text,
  ADD COLUMN IF NOT EXISTS chargeable_weight numeric(10,2),
  ADD COLUMN IF NOT EXISTS cif_value_usd numeric(12,2),
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS additional_emails text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS additional_phones text[] DEFAULT '{}';

-- Keep customer table synchronized
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS additional_emails text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS additional_phones text[] DEFAULT '{}';

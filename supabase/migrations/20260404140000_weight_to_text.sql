-- Change chargeable_weight from numeric to text to allow flexible unit entry
ALTER TABLE public.leads 
  ALTER COLUMN chargeable_weight TYPE text USING chargeable_weight::text;

-- Update existing data to have better defaults if needed
UPDATE public.leads 
  SET chargeable_weight = chargeable_weight || ' kg' 
  WHERE chargeable_weight IS NOT NULL AND chargeable_weight NOT LIKE '% %';

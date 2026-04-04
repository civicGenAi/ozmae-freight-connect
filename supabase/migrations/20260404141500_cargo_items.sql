-- Add cargo_items as JSONB to store the tabular cargo details
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS cargo_items jsonb DEFAULT '[]';

-- Optional: Initialize cargo_items with existing cargo_description if any
UPDATE public.leads 
  SET cargo_items = jsonb_build_array(
    jsonb_build_object(
      'description', cargo_description,
      'unit', '1*40HC',
      'remarks', ''
    )
  )
  WHERE (cargo_items IS NULL OR jsonb_array_length(cargo_items) = 0) 
    AND cargo_description IS NOT NULL 
    AND cargo_description != '';

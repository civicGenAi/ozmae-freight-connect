-- Add missing DELETE policy for quotations table
-- This was preventing authenticated users from deleting quotations via RLS
CREATE POLICY "Authenticated delete" ON public.quotations 
  FOR DELETE USING (auth.role() = 'authenticated');

-- Also ensure quotation_items can be deleted (needed to clean up child rows)
-- Using DO block to avoid error if table doesn't exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotation_items') THEN
    -- Add DELETE policy if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotation_items' AND cmd = 'DELETE') THEN
      EXECUTE 'CREATE POLICY "Authenticated delete" ON public.quotation_items FOR DELETE USING (auth.role() = ''authenticated'')';
    END IF;
  END IF;
END $$;

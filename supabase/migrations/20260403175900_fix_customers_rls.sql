-- Explicit RLS Policies for Customers table
-- This ensures all authenticated users can fully manage customers

-- 1. Enable RLS (if not already)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing policies to avoid duplicates or conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Authenticated read" ON public.customers;
    DROP POLICY IF EXISTS "Authenticated select" ON public.customers;
    DROP POLICY IF EXISTS "Authenticated insert" ON public.customers;
    DROP POLICY IF EXISTS "Authenticated update" ON public.customers;
    DROP POLICY IF EXISTS "Authenticated delete" ON public.customers;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 3. Create fresh policies
CREATE POLICY "Authenticated select" 
ON public.customers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated insert" 
ON public.customers FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated update" 
ON public.customers FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated delete" 
ON public.customers FOR DELETE 
TO authenticated 
USING (true);

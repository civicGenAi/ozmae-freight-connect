-- SUPABASE MIGRATION: Security Policy Fix v2
-- Fixes the redirection loop by allowing users to update their own profile security flags.

-- 1. DROP OLD RESTRICTIVE POLICY IF EXISTS
DROP POLICY IF EXISTS "Own profile" ON public.profiles;

-- 2. CREATE NEW COMPREHENSIVE POLICY
-- This allows users to SELECT and UPDATE their OWN profile record.
CREATE POLICY "Users can manage own profile" 
ON public.profiles 
FOR ALL 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. ENSURE RLS IS ENABLED
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RE-ADD INDEXES IF MISSING (already in schema but for safety)
CREATE INDEX IF NOT EXISTS idx_profiles_id_auth ON public.profiles(id);


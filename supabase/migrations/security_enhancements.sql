-- SUPABASE MIGRATION: Security & Profile Enhancements

-- 1. ADD PASSWORD TRACKING TO PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_updated_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_using_default_password boolean DEFAULT true;

-- 2. INITIALIZE EXISTING USERS
-- Default to created_at if never updated
UPDATE public.profiles SET password_updated_at = created_at WHERE password_updated_at IS NULL;

-- 3. SECURITY TRIGGER FUNCTION
-- This can be called via a SECURITY DEFINER function when the user updates their password
CREATE OR REPLACE FUNCTION public.confirm_password_update()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET password_updated_at = now(),
      is_using_default_password = false
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

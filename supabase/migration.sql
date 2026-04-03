-- Ozmae Freight System - Database Migration
-- Run these commands in your Supabase SQL Editor to sync with the latest frontend updates.

-- 1. Rename rate_cards to rate_card and add route column
ALTER TABLE public.rate_cards RENAME TO rate_card;
ALTER TABLE public.rate_card ADD COLUMN route text;
UPDATE public.rate_card SET route = origin || ' → ' || destination WHERE route IS NULL;

-- 2. Add status column to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status text default 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- 2.5 Add columns to profiles and security_logs
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.security_logs ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.security_logs ADD COLUMN IF NOT EXISTS user_agent text;

-- 3. Create quotation_items table
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Create company_profile table
CREATE TABLE IF NOT EXISTS public.company_profile (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name text NOT NULL,
  address text,
  email text,
  phone text,
  tin text,
  website text,
  logo_url text,
  bank_details text,
  updated_at timestamptz DEFAULT now()
);

-- 5. Enable RLS and add policies
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

-- If policies don't exist, create them
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated read' AND polrelid = 'public.quotation_items'::regclass) THEN
        CREATE POLICY "Authenticated read" ON public.quotation_items FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated insert/update' AND polrelid = 'public.company_profile'::regclass) THEN
        CREATE POLICY "Authenticated insert/update" ON public.company_profile FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 6. Create user_sessions table for dynamic tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address text,
  user_agent text,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 7. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view own sessions' AND polrelid = 'public.user_sessions'::regclass) THEN
        CREATE POLICY "Users can view own sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view own notifications' AND polrelid = 'public.notifications'::regclass) THEN
        CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update own notifications' AND polrelid = 'public.notifications'::regclass) THEN
        CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 8. Ensure Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('company', 'company', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Avatars & Company Logos
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars', 'company', 'logistic-files'));
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'company', 'logistic-files') AND auth.role() = 'authenticated');
CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE USING (bucket_id IN ('avatars', 'company', 'logistic-files') AND auth.uid() = owner);

-- 9. Extend company_profile with advanced fields
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS vrn text;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS business_license text;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS representative_name text;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS representative_phone text;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS bio text;

-- 10. Ensure 'logistic-files' bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logistic-files', 'logistic-files', true)
ON CONFLICT (id) DO NOTHING;

-- 11. Add missing INSERT policies for security auditing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can insert own sessions' AND polrelid = 'public.user_sessions'::regclass) THEN
        CREATE POLICY "Users can insert own sessions" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can insert own security logs' AND polrelid = 'public.security_logs'::regclass) THEN
        CREATE POLICY "Users can insert own security logs" ON public.security_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

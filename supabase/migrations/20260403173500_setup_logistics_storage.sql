-- Comprehensive Storage Setup
-- Ensures all required buckets for the Ozmae Freight System exist and have proper permissions

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('logistic-files', 'logistic-files', true),
  ('avatars', 'avatars', true),
  ('company', 'company', true),
  ('quotations', 'quotations', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Setup Public Read Access for all buckets
CREATE POLICY "Public Select Access"
ON storage.objects FOR SELECT
USING ( bucket_id IN ('logistic-files', 'avatars', 'company', 'quotations') );

-- 3. Setup Authenticated Insert Access
CREATE POLICY "Authenticated Insert Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id IN ('logistic-files', 'avatars', 'company', 'quotations') );

-- 4. Setup Authenticated Update Access
CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id IN ('logistic-files', 'avatars', 'company', 'quotations') );

-- 5. Setup Authenticated Delete Access
CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id IN ('logistic-files', 'avatars', 'company', 'quotations') );

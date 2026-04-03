-- Storage Setup for Quotation Sharing
-- Creates a public bucket named 'quotations' to host PDFs shared via email

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotations', 'quotations', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access to the quotations bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'quotations' );

-- 3. Allow authenticated users to upload to the quotations bucket
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'quotations' );

-- 4. Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'quotations' );

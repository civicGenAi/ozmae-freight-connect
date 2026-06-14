-- Ensure the documents table allows authenticated read/insert/delete so the
-- Document Vault can upload and manage files. (RLS is enabled in schema.sql;
-- without write policies, inserts are silently blocked.)

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read" ON public.documents;
DROP POLICY IF EXISTS "Authenticated insert" ON public.documents;
DROP POLICY IF EXISTS "Authenticated delete" ON public.documents;
CREATE POLICY "Authenticated read" ON public.documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert" ON public.documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete" ON public.documents FOR DELETE USING (auth.role() = 'authenticated');

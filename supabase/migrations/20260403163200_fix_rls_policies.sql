-- Row Level Security (RLS) Policy Updates
-- Adds INSERT, UPDATE, and DELETE policies for core CRM tables to allow authenticated users to manage data

-- Fix LEADS policies
CREATE POLICY "Authenticated insert" ON public.leads FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update" ON public.leads FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete" ON public.leads FOR DELETE USING (auth.role() = 'authenticated');

-- Fix QUOTATIONS policies
CREATE POLICY "Authenticated insert" ON public.quotations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update" ON public.quotations FOR UPDATE USING (auth.role() = 'authenticated');

-- Fix RATE_CARD (Agent Library) policies
CREATE POLICY "Authenticated insert" ON public.rate_card FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update" ON public.rate_card FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete" ON public.rate_card FOR DELETE USING (auth.role() = 'authenticated');

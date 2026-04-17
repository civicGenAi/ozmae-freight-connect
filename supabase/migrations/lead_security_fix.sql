-- Migration: Lead Status Management Security
-- Grant UPDATE and INSERT permissions while enforcing conversion lockdown

-- Allow all authenticated users to insert new leads
CREATE POLICY "Authenticated insert" ON public.leads FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update leads IF they are not converted, or if the user is an admin
CREATE POLICY "Lead management update" ON public.leads FOR UPDATE 
USING (
  (status != 'converted') 
  OR 
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
)
WITH CHECK (
  (status != 'converted') 
  OR 
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

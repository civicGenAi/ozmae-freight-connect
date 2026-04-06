-- Create company resources table
CREATE TABLE IF NOT EXISTS public.company_resources (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  category text,
  file_path text NOT NULL,
  file_url text NOT NULL,
  size_bytes bigint,
  content_type text,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add security settings to company_profile
ALTER TABLE public.company_profile 
ADD COLUMN IF NOT EXISTS resource_pin_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS resource_pin_hash text;

-- Enable RLS
ALTER TABLE public.company_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_resources
-- Only admins can interact with company resources
CREATE POLICY "Admins can view company resources" ON public.company_resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage company resources" ON public.company_resources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Storage bucket for secure resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-private-resources', 'company-private-resources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Admins can access private resources" ON storage.objects
  FOR ALL USING (
    bucket_id = 'company-private-resources' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

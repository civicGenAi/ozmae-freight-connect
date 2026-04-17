-- SUPABASE MIGRATION: Operations v2 - Document Hub & Assignments

-- 1. JOB DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.job_documents (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_order_id uuid REFERENCES public.job_orders(id) ON DELETE CASCADE,
    name text NOT NULL,
    file_path text NOT NULL, -- Storage path
    file_type text, -- e.g. 'application/pdf'
    category text, -- e.g. 'Permit', 'Invoice', 'BL'
    uploaded_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.job_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see all job docs" ON public.job_documents FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload docs" ON public.job_documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. ENHANCE LEADS FOR ASSIGNMENT
-- Already has assigned_to, but let's add metadata for 'Operation Priority' or similar if needed.
-- But wait, the user said 'approving and assigning individuals' in leads.
-- So we should make sure 'assigned_to' is used for this.

-- 3. TRIGGER FOR DOCUMENT UPLOAD NOTIFICATION
CREATE OR REPLACE FUNCTION public.notify_on_job_doc()
RETURNS TRIGGER AS 49826
DECLARE
  job_num text;
BEGIN
  SELECT job_number INTO job_num FROM public.job_orders WHERE id = NEW.job_order_id;
  PERFORM public.broadcast_system_notification(
    'New Operation Document',
    'Document "' || NEW.name || '" was uploaded to Job ' || job_num,
    'info',
    'job_orders',
    NEW.job_order_id
  );
  RETURN NEW;
END;
49826 LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_job_doc ON public.job_documents;
CREATE TRIGGER trg_notify_job_doc
  AFTER INSERT ON public.job_documents
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_job_doc();


-- 4. TRIGGER FOR LEAD ASSIGNMENT NOTIFICATION
CREATE OR REPLACE FUNCTION public.notify_on_lead_assignment()
RETURNS TRIGGER AS 50275
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    PERFORM public.broadcast_system_notification(
      'Lead Assigned to You',
      'You have been assigned to inquiry #' || NEW.lead_number || ' (' || NEW.customer_name_raw || ').',
      'info',
      'leads',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
50275 LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_lead_assignment ON public.leads;
CREATE TRIGGER trg_notify_lead_assignment
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_lead_assignment();


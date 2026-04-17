-- SUPABASE MIGRATION: Notifications & Advanced Workflows

-- 1. ENHANCE QUOTATIONS STATUS
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
ALTER TABLE public.quotations ADD CONSTRAINT quotations_status_check 
  CHECK (status IN ('draft', 'awaiting_review', 'under_revision', 'approved', 'sent', 'accepted', 'declined', 'expired'));

-- 2. ENHANCE JOB ORDERS STATUS
ALTER TABLE public.job_orders DROP CONSTRAINT IF EXISTS job_orders_status_check;
ALTER TABLE public.job_orders ADD CONSTRAINT job_orders_status_check 
  CHECK (status IN ('planning', 'awaiting_deposit', 'deposit_confirmed', 'dispatched', 'picked_up', 'in_transit', 'at_destination', 'delivered', 'closed', 'cancelled', 'on_hold', 'approved', 'in_progress', 'completed'));

-- 3. CREATE QUOTATION COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.quotation_comments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.quotation_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read comments" ON public.quotation_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert comments" ON public.quotation_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. CREATE JOB PROGRESS REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.job_progress_reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_order_id uuid REFERENCES public.job_orders(id) ON DELETE CASCADE NOT NULL,
  status text,
  update_text text NOT NULL,
  location text,
  images text[], -- Array of image URLs
  reported_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.job_progress_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read reports" ON public.job_progress_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Operations and admins can manage reports" ON public.job_progress_reports FOR ALL USING (auth.role() = 'authenticated');

-- 5. BROADCAST NOTIFICATION SYSTEM

-- Function to broadcast a notification to all active users
CREATE OR REPLACE FUNCTION public.broadcast_system_notification(
  title_text text,
  message_text text,
  notif_type text DEFAULT 'info',
  rel_table text DEFAULT NULL,
  rel_id uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles WHERE is_active = true LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_table, related_id)
    VALUES (profile_record.id, title_text, message_text, notif_type, rel_table, rel_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function for New Lead
CREATE OR REPLACE FUNCTION public.notify_on_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.broadcast_system_notification(
    'New Logistics Inquiry',
    'A new inquiry from ' || NEW.customer_name_raw || ' has been received for ' || NEW.origin || ' to ' || NEW.destination || '.',
    'info',
    'leads',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function for New Quotation (Awaiting Review)
CREATE OR REPLACE FUNCTION public.notify_on_new_quotation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.broadcast_system_notification(
    'Quotation Review Required',
    'A new quotation ' || NEW.quote_number || ' has been created and requires administrative review.',
    'warning',
    'quotations',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.leads;
CREATE TRIGGER trg_notify_new_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_lead();

DROP TRIGGER IF EXISTS trg_notify_new_quotation ON public.quotations;
CREATE TRIGGER trg_notify_new_quotation
  AFTER INSERT ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_quotation();

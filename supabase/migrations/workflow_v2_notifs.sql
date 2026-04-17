-- SUPABASE MIGRATION: Workflow v2 - Advanced Operations & Reviews

-- 1. OPERATION TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.operation_templates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL, -- e.g. 'In Transit', 'Customs', 'Warehouse'
    template_text text NOT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.operation_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read templates" ON public.operation_templates FOR SELECT USING (auth.role() = 'authenticated');

-- Seed basic templates
INSERT INTO public.operation_templates (name, category, template_text) VALUES
('Shipment Dispatched', 'Transit', 'Your shipment has been dispatched from {origin}. Estimated arrival at {destination} remains {eta}.'),
('Customs Clearance Started', 'Customs', 'Customs documentation has been lodged. We are currently awaiting clearance at {port}.'),
('Shipment Delivered', 'Arrival', 'Shipment has been successfully delivered and signed for by the recipient at {destination}.')
ON CONFLICT DO NOTHING;

-- 2. ENHANCED NOTIFICATION TRIGGERS

-- Trigger for Quotation Comments
CREATE OR REPLACE FUNCTION public.notify_on_quotation_comment()
RETURNS TRIGGER AS $$
DECLARE
  creator_id uuid;
  commenter_name text;
BEGIN
  -- Get some info
  SELECT created_by INTO creator_id FROM public.quotations WHERE id = NEW.quotation_id;
  SELECT full_name INTO commenter_name FROM public.profiles WHERE id = NEW.user_id;

  -- Notify the creator
  INSERT INTO public.notifications (user_id, title, message, type, related_table, related_id)
  VALUES (
    creator_id, 
    'New Comment on Quotation', 
    commenter_name || ' added a comment: "' || LEFT(NEW.comment, 50) || '..."',
    'info',
    'quotations',
    NEW.quotation_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_quotation_comment ON public.quotation_comments;
CREATE TRIGGER trg_notify_quotation_comment
  AFTER INSERT ON public.quotation_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_quotation_comment();

-- Trigger for Quotation Status Changes (Approved / Under Revision)
CREATE OR REPLACE FUNCTION public.notify_on_quotation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- If under revision -> Notify creator
    IF NEW.status = 'under_revision' THEN
      PERFORM public.broadcast_system_notification(
        'Quotation Revision Required',
        'Quotation ' || NEW.quote_number || ' has been sent back for revision. Please check comments.',
        'warning',
        'quotations',
        NEW.id
      );
    -- If approved -> Notify all (Operations specific)
    ELSIF NEW.status = 'approved' THEN
      PERFORM public.broadcast_system_notification(
        'Quotation Approved',
        'Quotation ' || NEW.quote_number || ' has been approved. Operations can now initiate Work Detail.',
        'success',
        'quotations',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_quotation_status ON public.quotations;
CREATE TRIGGER trg_notify_quotation_status
  AFTER UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_quotation_status_change();

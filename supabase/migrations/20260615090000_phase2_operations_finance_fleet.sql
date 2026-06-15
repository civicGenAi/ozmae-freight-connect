-- PHASE 2: Operations & Tracking, Finance (receivables aging), Intelligence,
-- and Fleet & Resources enhancements. Purely additive — no existing column,
-- table, or policy is removed or renamed.

-- =====================================================================
-- 1. LIVE GPS + BORDER/CHECKPOINT TRACKING
--    Extend job_progress_reports with optional coordinates + checkpoint
--    flags. Existing rows are unaffected (all columns nullable / defaulted).
-- =====================================================================
ALTER TABLE public.job_progress_reports ADD COLUMN IF NOT EXISTS lat numeric(10,6);
ALTER TABLE public.job_progress_reports ADD COLUMN IF NOT EXISTS lng numeric(10,6);
ALTER TABLE public.job_progress_reports ADD COLUMN IF NOT EXISTS is_checkpoint boolean DEFAULT false;
ALTER TABLE public.job_progress_reports ADD COLUMN IF NOT EXISTS checkpoint_type text;

-- =====================================================================
-- 2. CUSTOMER SELF-SERVICE PORTAL
--    SECURITY DEFINER lookup used by the public /track page so anonymous
--    visitors get a single curated payload (job + timeline + linked
--    quotation/invoice summary + documents) without opening up table-wide
--    RLS to the anon role.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_public_tracking(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
  result jsonb;
BEGIN
  IF p_code IS NULL OR length(p_code) < 4 THEN
    RETURN NULL;
  END IF;

  SELECT jo.*, c.company_name AS customer_name,
         v.plate_number AS vehicle_plate, d.full_name AS driver_name
  INTO v_job
  FROM public.job_orders jo
  LEFT JOIN public.customers c ON c.id = jo.customer_id
  LEFT JOIN public.vehicles v ON v.id = jo.assigned_vehicle_id
  LEFT JOIN public.drivers d ON d.id = jo.assigned_driver_id
  WHERE jo.id::text ILIKE p_code || '%'
  LIMIT 1;

  IF v_job.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', v_job.id,
    'job_number', v_job.job_number,
    'origin', v_job.origin,
    'destination', v_job.destination,
    'status', v_job.status,
    'cargo_description', v_job.cargo_description,
    'cargo_weight_kg', v_job.cargo_weight_kg,
    'cargo_volume_m3', v_job.cargo_volume_m3,
    'estimated_departure', v_job.estimated_departure,
    'estimated_arrival', v_job.estimated_arrival,
    'actual_departure', v_job.actual_departure,
    'actual_arrival', v_job.actual_arrival,
    'customer_name', v_job.customer_name,
    'vehicle_plate', v_job.vehicle_plate,
    'driver_name', v_job.driver_name,
    'reports', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'update_text', r.update_text,
        'location', r.location,
        'lat', r.lat,
        'lng', r.lng,
        'is_checkpoint', r.is_checkpoint,
        'checkpoint_type', r.checkpoint_type,
        'created_at', r.created_at
      ) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM public.job_progress_reports r
      WHERE r.job_order_id = v_job.id
    ),
    'quotation', (
      SELECT jsonb_build_object(
        'quote_number', q.quote_number,
        'status', q.status,
        'total_amount_usd', q.total_amount_usd
      )
      FROM public.quotations q
      WHERE q.id = v_job.quotation_id
    ),
    'invoice', (
      SELECT jsonb_build_object(
        'invoice_number', i.invoice_number,
        'total_amount_usd', i.total_amount_usd,
        'deposit_amount_usd', i.deposit_amount_usd,
        'balance_amount_usd', i.balance_amount_usd,
        'deposit_status', i.deposit_status,
        'balance_status', i.balance_status,
        'deposit_due_date', i.deposit_due_date,
        'balance_due_date', i.balance_due_date
      )
      FROM public.invoices i
      WHERE i.job_order_id = v_job.id
      ORDER BY i.created_at DESC
      LIMIT 1
    ),
    'documents', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'document_type', doc.document_type,
        'file_name', doc.file_name,
        'file_path', doc.file_path,
        'created_at', doc.created_at
      ) ORDER BY doc.created_at DESC), '[]'::jsonb)
      FROM public.documents doc
      WHERE doc.job_order_id = v_job.id
         OR doc.invoice_id IN (SELECT i.id FROM public.invoices i WHERE i.job_order_id = v_job.id)
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tracking(text) TO anon, authenticated;

-- =====================================================================
-- 3. FINANCE: RECEIVABLES AGING — auto-flag overdue invoices
--    Callable from the Receivables Aging page to flip pending deposit/
--    balance statuses to 'overdue' once their due date has passed.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.flag_overdue_invoices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_count2 integer := 0;
BEGIN
  UPDATE public.invoices
  SET deposit_status = 'overdue', updated_at = now()
  WHERE deposit_status = 'pending'
    AND deposit_due_date IS NOT NULL
    AND deposit_due_date < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.invoices
  SET balance_status = 'overdue', updated_at = now()
  WHERE balance_status = 'pending'
    AND balance_due_date IS NOT NULL
    AND balance_due_date < CURRENT_DATE;
  GET DIAGNOSTICS v_count2 = ROW_COUNT;

  RETURN v_count + v_count2;
END;
$$;

GRANT EXECUTE ON FUNCTION public.flag_overdue_invoices() TO authenticated;

-- Reminder log (in-app now; email/sms/whatsapp channels recorded as intent
-- for when those integrations go live).
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id),
  reminder_type text NOT NULL CHECK (reminder_type IN ('deposit', 'balance')),
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp')),
  message text,
  sent_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice ON public.payment_reminders(invoice_id);

ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read" ON public.payment_reminders;
DROP POLICY IF EXISTS "Authenticated insert" ON public.payment_reminders;
CREATE POLICY "Authenticated read" ON public.payment_reminders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert" ON public.payment_reminders FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================================
-- 4. FLEET: maintenance & document expiry tracking
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  record_type text NOT NULL DEFAULT 'other' CHECK (record_type IN ('insurance', 'inspection', 'service', 'registration', 'other')),
  title text,
  due_date date,
  last_done_date date,
  cost_usd numeric(10,2),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle ON public.vehicle_maintenance(vehicle_id);

DROP TRIGGER IF EXISTS trg_vehicle_maintenance_upd ON public.vehicle_maintenance;
CREATE TRIGGER trg_vehicle_maintenance_upd BEFORE UPDATE ON public.vehicle_maintenance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read" ON public.vehicle_maintenance;
DROP POLICY IF EXISTS "Authenticated insert" ON public.vehicle_maintenance;
DROP POLICY IF EXISTS "Authenticated update" ON public.vehicle_maintenance;
DROP POLICY IF EXISTS "Authenticated delete" ON public.vehicle_maintenance;
CREATE POLICY "Authenticated read" ON public.vehicle_maintenance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert" ON public.vehicle_maintenance FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update" ON public.vehicle_maintenance FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete" ON public.vehicle_maintenance FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================================
-- 5. FLEET: fuel & trip cost logging — tag existing job_costs rows to a
--    vehicle so per-vehicle fuel/trip spend can be reported. Nullable so
--    existing cost rows and the Job Costing UI are unaffected.
-- =====================================================================
ALTER TABLE public.job_costs ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id);
CREATE INDEX IF NOT EXISTS idx_job_costs_vehicle ON public.job_costs(vehicle_id);

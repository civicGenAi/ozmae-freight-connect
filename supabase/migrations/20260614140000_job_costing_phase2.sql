-- Job Costing (phase 2): payables status on costs + extra billable charges.

-- 1) Payables tracking on cost lines
ALTER TABLE public.job_costs
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'owed',
  ADD COLUMN IF NOT EXISTS paid_on date;

-- guard the allowed values (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_costs_payment_status_check'
  ) THEN
    ALTER TABLE public.job_costs
      ADD CONSTRAINT job_costs_payment_status_check
      CHECK (payment_status IN ('owed', 'paid'));
  END IF;
END $$;

-- 2) Extra billable charges (revenue side) added on top of the quoted amount
CREATE TABLE IF NOT EXISTS public.job_charges (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_order_id uuid REFERENCES public.job_orders(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text,
  amount_usd numeric(12,2) NOT NULL DEFAULT 0,
  incurred_on date DEFAULT now(),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_charges_job ON public.job_charges(job_order_id);

DROP TRIGGER IF EXISTS trg_job_charges_upd ON public.job_charges;
CREATE TRIGGER trg_job_charges_upd BEFORE UPDATE ON public.job_charges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.job_charges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read" ON public.job_charges;
DROP POLICY IF EXISTS "Authenticated insert" ON public.job_charges;
DROP POLICY IF EXISTS "Authenticated update" ON public.job_charges;
DROP POLICY IF EXISTS "Authenticated delete" ON public.job_charges;
CREATE POLICY "Authenticated read" ON public.job_charges FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert" ON public.job_charges FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update" ON public.job_charges FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete" ON public.job_charges FOR DELETE USING (auth.role() = 'authenticated');

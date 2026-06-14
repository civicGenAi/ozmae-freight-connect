-- Job Costing (phase 1): per-job cost line items used to compute the true cost
-- and the profit/loss of each job. Revenue is taken from the linked quotation
-- (or job_orders.total_amount); this table captures the cost side.

CREATE TABLE IF NOT EXISTS public.job_costs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_order_id uuid REFERENCES public.job_orders(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text,
  amount_usd numeric(12,2) NOT NULL DEFAULT 0,
  payee text,
  incurred_on date DEFAULT now(),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_costs_job ON public.job_costs(job_order_id);

-- keep updated_at fresh (reuses the shared trigger function from schema.sql)
DROP TRIGGER IF EXISTS trg_job_costs_upd ON public.job_costs;
CREATE TRIGGER trg_job_costs_upd BEFORE UPDATE ON public.job_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: authenticated users can fully manage cost lines. (Learned the hard way on
-- job_orders: enabling RLS without write policies silently blocks writes.)
ALTER TABLE public.job_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read" ON public.job_costs;
DROP POLICY IF EXISTS "Authenticated insert" ON public.job_costs;
DROP POLICY IF EXISTS "Authenticated update" ON public.job_costs;
DROP POLICY IF EXISTS "Authenticated delete" ON public.job_costs;
CREATE POLICY "Authenticated read" ON public.job_costs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert" ON public.job_costs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update" ON public.job_costs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete" ON public.job_costs FOR DELETE USING (auth.role() = 'authenticated');

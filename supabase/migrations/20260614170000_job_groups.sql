-- Optional saved job groupings (a.k.a. consolidated shipments) for joint costing.
-- Purely additive: normal per-job costing is unaffected. A group just stores a
-- name + the set of job ids so a combined profit/loss view can be reopened later.

CREATE TABLE IF NOT EXISTS public.job_groups (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  note text,
  job_ids uuid[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_job_groups_upd ON public.job_groups;
CREATE TRIGGER trg_job_groups_upd BEFORE UPDATE ON public.job_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.job_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read" ON public.job_groups;
DROP POLICY IF EXISTS "Authenticated insert" ON public.job_groups;
DROP POLICY IF EXISTS "Authenticated update" ON public.job_groups;
DROP POLICY IF EXISTS "Authenticated delete" ON public.job_groups;
CREATE POLICY "Authenticated read" ON public.job_groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert" ON public.job_groups FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update" ON public.job_groups FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete" ON public.job_groups FOR DELETE USING (auth.role() = 'authenticated');

-- Fix: job_orders (and the tables touched by the job workflow) had RLS enabled
-- with only a SELECT policy. Postgres RLS silently turns a blocked UPDATE into a
-- 0-row no-op (no error), so changing a job status appeared to succeed in the UI
-- but never persisted. These policies grant authenticated users INSERT/UPDATE/
-- DELETE so status changes (and creation of drivers/vehicles during job setup)
-- actually save.
--
-- Idempotent: safe to run multiple times.

-- JOB_ORDERS
DROP POLICY IF EXISTS "Authenticated insert" ON public.job_orders;
DROP POLICY IF EXISTS "Authenticated update" ON public.job_orders;
DROP POLICY IF EXISTS "Authenticated delete" ON public.job_orders;
CREATE POLICY "Authenticated insert" ON public.job_orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update" ON public.job_orders FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete" ON public.job_orders FOR DELETE USING (auth.role() = 'authenticated');

-- JOB_STATUS_TIMELINE (written by the status-change trigger / progress reports)
DROP POLICY IF EXISTS "Authenticated insert" ON public.job_status_timeline;
CREATE POLICY "Authenticated insert" ON public.job_status_timeline FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- DRIVERS (created on-the-fly during job setup)
DROP POLICY IF EXISTS "Authenticated insert" ON public.drivers;
DROP POLICY IF EXISTS "Authenticated update" ON public.drivers;
CREATE POLICY "Authenticated insert" ON public.drivers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update" ON public.drivers FOR UPDATE USING (auth.role() = 'authenticated');

-- VEHICLES (created on-the-fly during job setup)
DROP POLICY IF EXISTS "Authenticated insert" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated update" ON public.vehicles;
CREATE POLICY "Authenticated insert" ON public.vehicles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update" ON public.vehicles FOR UPDATE USING (auth.role() = 'authenticated');

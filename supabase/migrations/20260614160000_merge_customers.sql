-- Merge duplicate customer records into one.
--
-- Reassigns every child record (leads, quotations, job_orders, invoices,
-- payments, CRM data) from the duplicate ids to a chosen primary id, then
-- deletes the duplicates. Runs as SECURITY DEFINER so it bypasses per-table RLS
-- (invoices/payments etc. otherwise block the UPDATE and silently no-op).

CREATE OR REPLACE FUNCTION public.merge_customers(p_primary uuid, p_dupes uuid[])
RETURNS void AS $$
BEGIN
  -- never let the primary be in the dupes list
  p_dupes := array_remove(p_dupes, p_primary);
  IF p_dupes IS NULL OR array_length(p_dupes, 1) IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.leads                 SET customer_id = p_primary WHERE customer_id = ANY(p_dupes);
  UPDATE public.quotations            SET customer_id = p_primary WHERE customer_id = ANY(p_dupes);
  UPDATE public.job_orders            SET customer_id = p_primary WHERE customer_id = ANY(p_dupes);
  UPDATE public.invoices              SET customer_id = p_primary WHERE customer_id = ANY(p_dupes);
  UPDATE public.payments              SET customer_id = p_primary WHERE customer_id = ANY(p_dupes);

  -- CRM tables (created by later migrations; guard in case they don't exist)
  IF to_regclass('public.customer_interactions') IS NOT NULL THEN
    UPDATE public.customer_interactions SET customer_id = p_primary WHERE customer_id = ANY(p_dupes);
  END IF;
  IF to_regclass('public.crm_tasks') IS NOT NULL THEN
    UPDATE public.crm_tasks SET customer_id = p_primary WHERE customer_id = ANY(p_dupes);
  END IF;
  IF to_regclass('public.decline_reasons') IS NOT NULL THEN
    UPDATE public.decline_reasons SET customer_id = p_primary WHERE customer_id = ANY(p_dupes);
  END IF;
  IF to_regclass('public.customer_health') IS NOT NULL THEN
    -- health is per-customer and auto-recomputed; just drop the dupes' rows
    DELETE FROM public.customer_health WHERE customer_id = ANY(p_dupes);
  END IF;

  DELETE FROM public.customers WHERE id = ANY(p_dupes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.merge_customers(uuid, uuid[]) TO authenticated;

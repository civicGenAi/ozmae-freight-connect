-- Automatic Health Registration for New Customers
-- This ensures they show up in the CRM Portfolio immediately with a "New" status

CREATE OR REPLACE FUNCTION public.handle_new_customer_health()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customer_health (
    customer_id,
    health_score,
    health_label,
    total_jobs,
    total_revenue_usd,
    outstanding_balance_usd
  ) VALUES (
    NEW.id,
    0,            -- Initial score
    'inactive',   -- Default label until first activity
    0,
    0,
    0
  ) ON CONFLICT (customer_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run after a new customer is inserted
DROP TRIGGER IF EXISTS trg_new_customer_health ON public.customers;
CREATE TRIGGER trg_new_customer_health
AFTER INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_customer_health();

-- BACKFILL: Create health records for any existing customers who missed the nightly cron
INSERT INTO public.customer_health (customer_id, health_score, health_label)
SELECT id, 0, 'inactive'
FROM public.customers
WHERE id NOT IN (SELECT customer_id FROM public.customer_health)
ON CONFLICT DO NOTHING;

-- Relax constraints for CRM interactions and tasks
-- This allows logging interactions for leads before they are converted to formal customers

-- 1. Relax customer_id constraint in customer_interactions
ALTER TABLE public.customer_interactions 
ALTER COLUMN customer_id DROP NOT NULL;

-- 2. Relax customer_id constraint in crm_tasks
-- (Tasks created from interactions or leads should also be allowed without a customer profile)
ALTER TABLE public.crm_tasks 
ALTER COLUMN customer_id DROP NOT NULL;

-- 3. Add a check constraint to ensure either customer_id or lead_id is present
-- This prevents "orphaned" interactions that aren't linked to anything
ALTER TABLE public.customer_interactions 
ADD CONSTRAINT customer_or_lead_required 
CHECK (customer_id IS NOT NULL OR lead_id IS NOT NULL);

ALTER TABLE public.crm_tasks 
ADD CONSTRAINT task_customer_or_lead_required 
CHECK (customer_id IS NOT NULL OR lead_id IS NOT NULL);

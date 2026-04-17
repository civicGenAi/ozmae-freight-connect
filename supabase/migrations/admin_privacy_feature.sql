-- Add draft columns to job_orders for Admin Privacy feature
ALTER TABLE public.job_orders ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT NULL;
ALTER TABLE public.job_orders ADD COLUMN IF NOT EXISTS has_pending_draft BOOLEAN DEFAULT FALSE;

-- Grant permissions if necessary (though RLS should handle visibility)
COMMENT ON COLUMN public.job_orders.draft_data IS 'Stores private administrative modifications before they are published to all staff.';
COMMENT ON COLUMN public.job_orders.has_pending_draft IS 'Flag indicating the existence of a private administrative draft.';

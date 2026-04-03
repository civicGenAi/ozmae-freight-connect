-- Automate Record Numbering
-- Ensures that lead_number, quote_number, and other identifiers are generated automatically by the database

-- 1. Update LEADS to use lead_number_seq
ALTER TABLE public.leads 
ALTER COLUMN lead_number SET DEFAULT 'L-' || nextval('lead_number_seq')::text;

-- 2. Update QUOTATIONS to use quote_number_seq
ALTER TABLE public.quotations 
ALTER COLUMN quote_number SET DEFAULT 'Q-' || nextval('quote_number_seq')::text;

-- 3. Update JOB_ORDERS to use job_number_seq
ALTER TABLE public.job_orders 
ALTER COLUMN job_number SET DEFAULT 'J-' || nextval('job_number_seq')::text;

-- 4. Update INVOICES to use invoice_number_seq
ALTER TABLE public.invoices 
ALTER COLUMN invoice_number SET DEFAULT 'INV-' || nextval('invoice_number_seq')::text;

-- 5. Update PAYMENTS to use payment_number_seq
ALTER TABLE public.payments 
ALTER COLUMN payment_number SET DEFAULT 'PAY-' || nextval('payment_number_seq')::text;

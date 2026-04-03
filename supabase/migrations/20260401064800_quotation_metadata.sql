-- Add metadata column to quotations for WYSIWYG editor support
alter table public.quotations 
add column if not exists metadata jsonb default '{}'::jsonb;

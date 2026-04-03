-- Ozmae Freight System - Database Schema

-- ENABLE EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- TABLE: profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('admin', 'sales', 'finance', 'operations')),
  avatar_url text,
  is_active boolean default true,
  totp_enabled boolean default false,
  totp_secret text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TABLE: customers
create table public.customers (
  id uuid default uuid_generate_v4() primary key,
  company_name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  country text default 'Tanzania',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TABLE: leads
create table public.leads (
  id uuid default uuid_generate_v4() primary key,
  lead_number text unique not null,
  customer_id uuid references public.customers(id),
  customer_name_raw text,
  origin text not null,
  destination text not null,
  cargo_type text not null,
  cargo_weight_kg numeric(10,2),
  cargo_description text,
  special_handling text,
  inquiry_channel text check (inquiry_channel in ('email', 'phone', 'whatsapp', 'walk_in', 'other')),
  status text default 'new' check (status in ('new', 'quoted', 'converted', 'declined', 'archived')),
  assigned_to uuid references public.profiles(id),
  decline_reason text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TABLE: quotations
create table public.quotations (
  id uuid default uuid_generate_v4() primary key,
  quote_number text unique not null,
  lead_id uuid references public.leads(id),
  customer_id uuid references public.customers(id) not null,
  origin text not null,
  destination text not null,
  cargo_description text,
  cargo_weight_kg numeric(10,2),
  cargo_volume_m3 numeric(10,2),
  vehicle_type text,
  base_rate_usd numeric(10,2) not null,
  fuel_surcharge_usd numeric(10,2) default 0,
  handling_fee_usd numeric(10,2) default 0,
  other_charges_usd numeric(10,2) default 0,
  total_amount_usd numeric(10,2) not null,
  valid_until date not null,
  status text default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  terms_and_conditions text,
  notes text,
  created_by uuid references public.profiles(id),
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TABLE: vehicles
create table public.vehicles (
  id uuid default uuid_generate_v4() primary key,
  plate_number text unique not null,
  vehicle_type text not null check (vehicle_type in ('van', 'truck_10t', 'truck_20t', 'truck_30t', 'flatbed', 'trailer')),
  capacity_tons numeric(6,2),
  make text,
  model text,
  year integer,
  status text default 'available' check (status in ('available', 'on_job', 'maintenance', 'retired')),
  current_job_id uuid, -- Reference added later via ALTER to avoid circular dependency
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TABLE: drivers
create table public.drivers (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  phone text not null,
  id_number text,
  license_number text,
  license_class text check (license_class in ('B', 'C', 'D', 'E', 'F')),
  license_expiry date,
  status text default 'available' check (status in ('available', 'on_duty', 'off', 'inactive')),
  assigned_vehicle_id uuid references public.vehicles(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TABLE: job_orders
create table public.job_orders (
  id uuid default uuid_generate_v4() primary key,
  job_number text unique not null,
  quotation_id uuid references public.quotations(id),
  customer_id uuid references public.customers(id) not null,
  origin text not null,
  destination text not null,
  cargo_description text,
  cargo_weight_kg numeric(10,2),
  cargo_volume_m3 numeric(10,2),
  special_handling text,
  status text default 'planning' check (status in ('planning', 'awaiting_deposit', 'deposit_confirmed', 'dispatched', 'picked_up', 'in_transit', 'at_destination', 'delivered', 'closed', 'cancelled')),
  assigned_driver_id uuid references public.drivers(id),
  assigned_vehicle_id uuid references public.vehicles(id),
  estimated_departure date,
  estimated_arrival date,
  actual_departure timestamptz,
  actual_arrival timestamptz,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Circular reference fix
alter table public.vehicles add constraint fk_vehicles_job foreign key (current_job_id) references public.job_orders(id);

-- TABLE: invoices
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  invoice_number text unique not null,
  job_order_id uuid references public.job_orders(id) not null,
  customer_id uuid references public.customers(id) not null,
  subtotal_usd numeric(10,2) not null,
  tax_rate numeric(5,4) default 0,
  tax_amount_usd numeric(10,2) default 0,
  total_amount_usd numeric(10,2) not null,
  deposit_percentage numeric(5,2) default 60,
  deposit_amount_usd numeric(10,2) not null,
  balance_amount_usd numeric(10,2) not null,
  deposit_status text default 'pending' check (deposit_status in ('pending', 'paid', 'overdue')),
  balance_status text default 'pending' check (balance_status in ('pending', 'paid', 'overdue')),
  deposit_due_date date,
  balance_due_date date,
  payment_terms text,
  bank_details text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TABLE: payments
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  payment_number text unique not null,
  invoice_id uuid references public.invoices(id) not null,
  job_order_id uuid references public.job_orders(id),
  customer_id uuid references public.customers(id),
  payment_type text not null check (payment_type in ('deposit', 'balance', 'full', 'partial')),
  amount_usd numeric(10,2) not null,
  payment_method text check (payment_method in ('bank_transfer', 'mobile_money', 'cash', 'cheque')),
  reference_number text,
  payment_date date not null,
  status text default 'completed' check (status in ('pending', 'completed', 'failed', 'refunded')),
  recorded_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz default now()
);

-- TABLE: job_status_timeline
create table public.job_status_timeline (
  id uuid default uuid_generate_v4() primary key,
  job_order_id uuid references public.job_orders(id) not null,
  status text not null,
  notes text,
  location text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- TABLE: documents
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  job_order_id uuid references public.job_orders(id),
  invoice_id uuid references public.invoices(id),
  quotation_id uuid references public.quotations(id),
  document_type text not null check (document_type in ('quotation_pdf', 'invoice_pdf', 'pickup_confirmation', 'delivery_note', 'payment_receipt', 'other')),
  file_name text not null,
  file_path text not null,
  file_size_bytes integer,
  mime_type text,
  is_signed boolean default false,
  signed_by text,
  signed_at timestamptz,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- TABLE: notifications
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  message text not null,
  type text check (type in ('info', 'success', 'warning', 'error')),
  related_table text,
  related_id uuid,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- TABLE: security_logs
create table public.security_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  event_type text not null,
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamptz default now()
);

-- TABLE: rate_card
create table public.rate_card (
  id uuid default uuid_generate_v4() primary key,
  route text, -- Combined origin-destination for easy lookup
  origin text not null,
  destination text not null,
  vehicle_type text not null check (vehicle_type in ('van', 'truck_10t', 'truck_20t', 'truck_30t', 'flatbed', 'trailer')),
  base_rate_usd numeric(10,2) not null,
  per_km_rate_usd numeric(10,4),
  min_cargo_weight_kg numeric(10,2),
  notes text,
  is_active boolean default true,
  updated_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TABLE: quotation_items
create table public.quotation_items (
  id uuid default uuid_generate_v4() primary key,
  quotation_id uuid references public.quotations(id) on delete cascade not null,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(10,2) not null,
  total numeric(10,2) not null,
  created_at timestamptz default now()
);

-- TABLE: company_profile
create table public.company_profile (
  id uuid default uuid_generate_v4() primary key,
  company_name text not null,
  address text,
  email text,
  phone text,
  tin text,
  website text,
  logo_url text,
  bank_details text,
  updated_at timestamptz default now()
);

-- AUTO-INCREMENT NUMBER SEQUENCES
create sequence if not exists lead_number_seq start 1000;
create sequence if not exists quote_number_seq start 2000;
create sequence if not exists job_number_seq start 3000;
create sequence if not exists invoice_number_seq start 4000;
create sequence if not exists payment_number_seq start 5000;

-- TRIGGERS: Auto-set updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_profiles_upd before update on public.profiles for each row execute function update_updated_at();
create trigger trg_leads_upd before update on public.leads for each row execute function update_updated_at();
create trigger trg_quotations_upd before update on public.quotations for each row execute function update_updated_at();
create trigger trg_job_orders_upd before update on public.job_orders for each row execute function update_updated_at();
create trigger trg_invoices_upd before update on public.invoices for each row execute function update_updated_at();
create trigger trg_vehicles_upd before update on public.vehicles for each row execute function update_updated_at();
create trigger trg_drivers_upd before update on public.drivers for each row execute function update_updated_at();
create trigger trg_customers_upd before update on public.customers for each row execute function update_updated_at();
create trigger trg_rate_card_upd before update on public.rate_card for each row execute function update_updated_at();

-- TRIGGER: Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'sales')
  );
  return new;
end;
$$ language plpgsql security definer;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- TRIGGER: Auto-log job status changes
create or replace function log_job_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into public.job_status_timeline (job_order_id, status, recorded_by)
    values (new.id, new.status, new.created_by);
  end if;
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_job_status_log') then
    create trigger trg_job_status_log
      after update on public.job_orders
      for each row execute function log_job_status_change();
  end if;
end $$;

-- ROW LEVEL SECURITY (Enable on all tables)
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.quotations enable row level security;
alter table public.job_orders enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.security_logs enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.rate_card enable row level security;
alter table public.quotation_items enable row level security;
alter table public.company_profile enable row level security;
alter table public.job_status_timeline enable row level security;

-- POLICIES
create policy "Authenticated read" on public.leads for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.quotations for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.job_orders for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.customers for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.vehicles for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.drivers for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.rate_card for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.quotation_items for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.company_profile for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.job_status_timeline for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.invoices for select using (auth.role() = 'authenticated');
create policy "Authenticated read" on public.payments for select using (auth.role() = 'authenticated');
create policy "Authenticated insert" on public.security_logs for insert with check (auth.role() = 'authenticated');
create policy "Authenticated read" on public.security_logs for select using (auth.role() = 'authenticated');

create policy "Own notifications" on public.notifications for all using (user_id = auth.uid());
create policy "Own profile" on public.profiles for select using (id = auth.uid());

-- INDEXES
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_assigned_to on public.leads(assigned_to);
create index if not exists idx_quotations_status on public.quotations(status);
create index if not exists idx_quotations_customer on public.quotations(customer_id);
create index if not exists idx_job_orders_status on public.job_orders(status);
create index if not exists idx_job_orders_customer on public.job_orders(customer_id);
create index if not exists idx_invoices_job on public.invoices(job_order_id);
create index if not exists idx_invoices_deposit_status on public.invoices(deposit_status);
create index if not exists idx_documents_job on public.documents(job_order_id);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read);
create index if not exists idx_security_logs_user on public.security_logs(user_id);
create index if not exists idx_payments_invoice on public.payments(invoice_id);

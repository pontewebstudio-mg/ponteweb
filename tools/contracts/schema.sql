-- PonteWeb Studio: contracts automation tables

-- 1) Track Mercado Pago payments linked to orders
create table if not exists public.pw_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.pw_orders(id) on delete cascade,
  provider text not null check (provider in ('mercadopago','pix_direto','cripto','transferencia')),
  provider_payment_id text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pw_payments_order_id_idx on public.pw_payments(order_id);
create index if not exists pw_payments_provider_payment_id_idx on public.pw_payments(provider_payment_id);

-- 2) Queue contract sending (processed by local OpenClaw script)
create table if not exists public.pw_contract_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.pw_orders(id) on delete cascade,
  payment_provider text not null,
  payment_id text,
  status text not null default 'pending' check (status in ('pending','sent','error')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create unique index if not exists pw_contract_jobs_order_id_unique_pending
  on public.pw_contract_jobs(order_id)
  where status='pending';

-- Basic RLS: only service role should read/update these (agent/local scripts).
alter table public.pw_payments enable row level security;
alter table public.pw_contract_jobs enable row level security;

-- No public policies (default deny). We'll use service role key from server/local scripts.

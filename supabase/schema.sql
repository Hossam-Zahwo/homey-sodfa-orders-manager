-- Orders Manager only: run in a brand-new independent Supabase project.
-- No tables in the existing HOMEY projects are touched.
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 brand text not null check (brand in ('homey','sodfa')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 1,
 customer_name text not null,
 phone text not null,
 alternate_phone text not null default '',
 governorate text not null default '',
 city text not null default '',
 address text not null default '',
 source text not null default '',
 payment_method text not null default '',
 prepaid numeric(14,2) not null default 0 check (prepaid>=0),
 shipping numeric(14,2) not null default 0 check (shipping>=0),
 discount numeric(14,2) not null default 0 check (discount>=0),
 items jsonb not null default '[]'::jsonb,
 status text not null default 'new' check (status in ('new','contacted','confirmed','preparing','shipped','delivered','cancelled','returned')),
 notes text not null default '',
 assigned_to text not null default '',
 deleted_at timestamptz
);
create table if not exists public.customers (
 id uuid primary key default gen_random_uuid(),
 brand text not null check (brand in ('homey','sodfa')),
 name text not null,
 phone text not null,
 alternate_phone text not null default '',
 governorate text not null default '',
 city text not null default '',
 address text not null default '',
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz
);
create table if not exists public.audit_log (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 actor text not null,
 action text not null,
 entity text not null,
 entity_id text not null,
 brand text not null,
 details text not null default ''
);
create index if not exists orders_brand_created_idx on public.orders(brand,created_at desc) where deleted_at is null;
create index if not exists orders_phone_idx on public.orders(brand,phone) where deleted_at is null;
create index if not exists customers_brand_phone_idx on public.customers(brand,phone) where deleted_at is null;
-- Data API must never expose customer data directly, even to signed-in users.
alter table public.orders enable row level security;
alter table public.customers enable row level security;
alter table public.audit_log enable row level security;
revoke all on table public.orders, public.customers, public.audit_log from anon, authenticated;
-- No anon/authenticated RLS policies. Only Vercel server-side service-role access,
-- behind authenticated AND explicitly allowlisted email checks.

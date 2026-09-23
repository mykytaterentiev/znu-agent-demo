create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 1. CATALOG & INVENTORY (Sales Advisor / Shared)
-- ==============================================================================
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  sku text unique not null,
  name text not null,
  price_usd numeric(10, 2) not null check (price_usd >= 0),
  category text
);
create index if not exists idx_products_sku on public.products(sku);

create table if not exists public.inventory (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  location text not null,
  stock_level integer not null check (stock_level >= 0),
  unique (product_id, location)
);
create index if not exists idx_inventory_product_id on public.inventory(product_id);


-- ==============================================================================
-- 2. ORDERS & DELIVERY (Delivery Recovery & Purchase Recovery)
-- ==============================================================================
create table if not exists public.orders (
  id text primary key,
  user_id text not null,
  status text not null,
  tracking_number text,
  promised_at timestamptz,
  product_sku text,
  purchased_at timestamptz,
  delay_reason text,
  shipping_tier text not null default 'STANDARD',
  return_status text not null default 'NOT_REQUESTED',
  recovery_status text not null default 'NOT_STARTED',
  recovery_offer numeric(10, 2) not null default 0 check (recovery_offer >= 0)
);
create index if not exists idx_orders_user_id on public.orders(user_id);

create table if not exists public.delivery_events (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references public.orders(id) on delete cascade,
  event_type text not null,
  location text,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_delivery_events_order_id on public.delivery_events(order_id);

create table if not exists public.carrier_contacts (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references public.orders(id) on delete cascade,
  reason text not null,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);
create index if not exists idx_carrier_contacts_order_id on public.carrier_contacts(order_id);

create table if not exists public.return_requests (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references public.orders(id) on delete cascade,
  action text not null check (action in ('RETURN', 'EXCHANGE')),
  replacement_sku text,
  status text not null default 'REQUESTED',
  created_at timestamptz not null default now()
);
create index if not exists idx_return_requests_order_id on public.return_requests(order_id);


-- ==============================================================================
-- 3. SALES & ENGAGEMENT (Sales Advisor)
-- ==============================================================================
create table if not exists public.behavioral_events (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  event_type text not null,
  product_sku text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_behavioral_events_user_id on public.behavioral_events(user_id);

create table if not exists public.active_carts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  total_value numeric(10, 2) not null default 0 check (total_value >= 0),
  applied_discount numeric(10, 2) not null default 0 check (applied_discount >= 0)
);
create index if not exists idx_active_carts_user_id on public.active_carts(user_id);


-- ==============================================================================
-- 4. ESCALATION & HUMAN REVIEW (Pillar 3: Escalation)
-- ==============================================================================
create table if not exists public.agent_escalations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  cart_id uuid references public.active_carts(id) on delete set null,
  attempted_action text not null,
  agent_summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_escalations_user_id on public.agent_escalations(user_id);

create table if not exists public.human_review_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  requested_action text not null,
  reason text not null,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);
create index if not exists idx_human_review_requests_user_id on public.human_review_requests(user_id);


-- ==============================================================================
-- SEED DATA
-- ==============================================================================
insert into public.products (sku, name, price_usd, category)
values
  ('AERO-01', 'Aero Runner 01', 428.00, 'Running shoes'),
  ('CITY-02', 'City Walker 02', 395.00, 'Walking shoes')
on conflict (sku) do update set
  name = excluded.name,
  price_usd = excluded.price_usd,
  category = excluded.category;

insert into public.inventory (product_id, location, stock_level)
select id, 'PHX-01', stock_level
from (
  values
    ('AERO-01', 18),
    ('CITY-02', 24)
) as catalog(sku, stock_level)
join public.products on products.sku = catalog.sku
on conflict (product_id, location) do update set
  stock_level = excluded.stock_level;

insert into public.orders (id, user_id, status, product_sku, purchased_at, return_status)
values ('NS-7714', 'case-study-student', 'DELIVERED', 'AERO-01', now() - interval '8 days', 'NOT_REQUESTED')
on conflict (id) do update set
  product_sku = excluded.product_sku,
  purchased_at = excluded.purchased_at,
  return_status = excluded.return_status;


-- ==============================================================================
-- SECURITY, RLS & GRANTS
-- ==============================================================================
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.delivery_events enable row level security;
alter table public.carrier_contacts enable row level security;
alter table public.return_requests enable row level security;
alter table public.behavioral_events enable row level security;
alter table public.active_carts enable row level security;
alter table public.agent_escalations enable row level security;
alter table public.human_review_requests enable row level security;

-- Service Role Grants (Agent)
grant all on all tables in schema public to service_role;

-- Public / Authenticated Grants
grant select on public.products, public.inventory to anon, authenticated;
grant select, update on public.active_carts to authenticated;

-- RLS Policies
create policy "catalog is readable" on public.products for select to anon, authenticated using (true);
create policy "inventory is readable" on public.inventory for select to anon, authenticated using (true);

create policy "users can read their carts" on public.active_carts for select to authenticated using ((select auth.uid()) = user_id);
create policy "users can update their carts" on public.active_carts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

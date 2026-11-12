-- =====================================================================
-- Sizzling Aroma — Restaurant Products Monitoring System
-- 001: Core schema (tables, enums, indexes, triggers)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Enums ----------
do $$ begin
  create type public.app_role as enum ('owner', 'staff', 'kitchen', 'dine_in');
exception when duplicate_object then null; end $$;

do $$ begin
  -- in / out: manual or scanned stock changes
  -- sale: automatic recipe deduction when a sale is recorded
  -- transfer_in / transfer_out: kitchen <-> dine-in transfers (Phase 2)
  create type public.movement_type as enum ('in', 'out', 'sale', 'transfer_in', 'transfer_out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.movement_method as enum ('scan', 'manual', 'sale', 'transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.category_kind as enum ('ingredient', 'menu', 'supply');
exception when duplicate_object then null; end $$;

-- ---------- Locations (Phase 2 ready: kitchen + dine-in/front) ----------
create table if not exists public.locations (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z_]+$'),
  name        text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
-- exactly one default location
create unique index if not exists locations_one_default on public.locations (is_default) where is_default;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text not null default '',
  username     text unique check (username is null or username ~ '^[a-z0-9._-]{3,32}$'),
  role         public.app_role not null default 'staff',
  location_id  uuid references public.locations (id) on delete set null,
  active       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);

-- ---------- Categories ----------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(trim(name)) between 1 and 60),
  kind        public.category_kind not null default 'ingredient',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- Products (stock items / ingredients) ----------
create sequence if not exists public.barcode_seq start 100001;

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) between 1 and 120),
  category_id  uuid references public.categories (id) on delete set null,
  unit         text not null default 'pcs' check (length(trim(unit)) between 1 and 20),
  min_stock    numeric(12,3) not null default 0 check (min_stock >= 0),
  price        numeric(12,2) not null default 0 check (price >= 0),
  expiry_date  date,
  supplier     text check (supplier is null or length(supplier) <= 120),
  barcode      text check (barcode is null or barcode ~ '^[A-Za-z0-9\-\.]{3,64}$'),
  archived_at  timestamptz,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- unique + indexed barcode among active products
create unique index if not exists products_barcode_unique on public.products (barcode) where archived_at is null and barcode is not null;
create index if not exists products_barcode_idx on public.products (barcode);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_name_idx on public.products (lower(name));
create index if not exists products_expiry_idx on public.products (expiry_date) where archived_at is null;

-- ---------- Stock per product per location ----------
create table if not exists public.product_stock (
  product_id   uuid not null references public.products (id) on delete cascade,
  location_id  uuid not null references public.locations (id) on delete restrict,
  quantity     numeric(12,3) not null default 0 check (quantity >= 0),
  updated_at   timestamptz not null default now(),
  primary key (product_id, location_id)
);
create index if not exists product_stock_location_idx on public.product_stock (location_id);

-- ---------- Menu items (what customers buy) ----------
create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique check (length(trim(name)) between 1 and 120),
  category_id  uuid references public.categories (id) on delete set null,
  price        numeric(12,2) not null check (price >= 0),
  barcode      text unique check (barcode is null or barcode ~ '^[A-Za-z0-9\-\.]{3,64}$'),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists menu_items_category_idx on public.menu_items (category_id);

-- ---------- Recipes (Phase 2: ingredient quantity per serving) ----------
create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid not null references public.menu_items (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete restrict,
  qty           numeric(12,3) not null check (qty > 0),
  unique (menu_item_id, product_id)
);
create index if not exists recipes_product_idx on public.recipes (product_id);

-- ---------- Sales ----------
create table if not exists public.sales (
  id           uuid primary key default gen_random_uuid(),
  sale_no      bigint generated always as identity unique,
  sold_at      timestamptz not null default now(),
  user_id      uuid references auth.users (id) on delete set null,
  location_id  uuid references public.locations (id) on delete set null,
  total        numeric(12,2) not null default 0 check (total >= 0),
  note         text check (note is null or length(note) <= 300),
  created_at   timestamptz not null default now()
);
create index if not exists sales_sold_at_idx on public.sales (sold_at desc);
create index if not exists sales_user_idx on public.sales (user_id);

create table if not exists public.sale_items (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid not null references public.sales (id) on delete cascade,
  menu_item_id  uuid not null references public.menu_items (id) on delete restrict,
  quantity      int not null check (quantity > 0 and quantity <= 1000),
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  line_total    numeric(12,2) not null check (line_total >= 0)
);
create index if not exists sale_items_sale_idx on public.sale_items (sale_id);
create index if not exists sale_items_menu_item_idx on public.sale_items (menu_item_id);

-- ---------- Stock movement log ----------
create table if not exists public.stock_movements (
  id             bigint generated always as identity primary key,
  product_id     uuid not null references public.products (id) on delete cascade,
  location_id    uuid not null references public.locations (id) on delete restrict,
  type           public.movement_type not null,
  method         public.movement_method not null,
  quantity       numeric(12,3) not null check (quantity > 0),   -- absolute amount moved
  delta          numeric(12,3) not null,                          -- signed change (+in / -out)
  balance_after  numeric(12,3) not null check (balance_after >= 0),
  expiry_date    date,
  note           text check (note is null or length(note) <= 300),
  user_id        uuid references auth.users (id) on delete set null,
  sale_id        uuid references public.sales (id) on delete set null,
  transfer_id    uuid,
  created_at     timestamptz not null default now()
);
create index if not exists stock_movements_created_idx on public.stock_movements (created_at desc);
create index if not exists stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index if not exists stock_movements_user_idx on public.stock_movements (user_id, created_at desc);
create index if not exists stock_movements_location_idx on public.stock_movements (location_id, created_at desc);
create index if not exists stock_movements_sale_idx on public.stock_movements (sale_id);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists menu_items_touch on public.menu_items;
create trigger menu_items_touch before update on public.menu_items
  for each row execute function public.touch_updated_at();
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- New auth user -> profile ----------
-- Role comes ONLY from app_metadata (settable by the service role / owner
-- user-management action), never from client-controlled user_metadata.
-- Users without an app_metadata role start inactive until the owner enables them.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.app_role;
  v_loc  uuid;
begin
  begin
    v_role := (new.raw_app_meta_data ->> 'role')::public.app_role;
  exception when others then
    v_role := null;
  end;
  begin
    v_loc := (new.raw_app_meta_data ->> 'location_id')::uuid;
  exception when others then
    v_loc := null;
  end;

  insert into public.profiles (id, name, username, role, location_id, active)
  values (
    new.id,
    coalesce(nullif(new.raw_app_meta_data ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    nullif(lower(new.raw_app_meta_data ->> 'username'), ''),
    coalesce(v_role, 'staff'),
    v_loc,
    v_role is not null
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Base locations ----------
insert into public.locations (code, name, is_default) values
  ('kitchen', 'Kitchen', true),
  ('dine_in', 'Dine-in (Front)', false)
on conflict (code) do nothing;

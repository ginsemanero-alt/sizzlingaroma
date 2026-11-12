-- =====================================================================
-- 002: Role helpers, views and transactional business functions.
-- Every stock change happens inside ONE function call (= one transaction)
-- together with its stock_movements log row.
-- =====================================================================

-- ---------- Role helpers ----------
create or replace function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() = 'owner', false)
$$;

create or replace function public.default_location_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.locations where is_default limit 1
$$;

-- owner / staff: every location. kitchen: kitchen only. dine_in: dine-in only.
create or replace function public.can_access_location(p_location_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.current_app_role()
    when 'owner'   then true
    when 'staff'   then true
    when 'kitchen' then exists (select 1 from public.locations where id = p_location_id and code = 'kitchen')
    when 'dine_in' then exists (select 1 from public.locations where id = p_location_id and code = 'dine_in')
    else false
  end
$$;

-- Location a user works in when none is given.
create or replace function public.home_location_id() returns uuid
language sql stable security definer set search_path = public as $$
  select case public.current_app_role()
    when 'kitchen' then (select id from public.locations where code = 'kitchen')
    when 'dine_in' then (select id from public.locations where code = 'dine_in')
    else public.default_location_id()
  end
$$;

-- ---------- Guard: never remove the last active owner ----------
create or replace function public.guard_last_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and old.active and (new.role <> 'owner' or not new.active) then
    if (select count(*) from public.profiles where role = 'owner' and active and id <> old.id) = 0 then
      raise exception 'At least one active Owner account is required.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_last_owner on public.profiles;
create trigger profiles_guard_last_owner before update on public.profiles
  for each row execute function public.guard_last_owner();

-- ---------- Views (security_invoker => RLS of the caller applies) ----------
create or replace view public.product_inventory with (security_invoker = true) as
select
  p.id,
  p.name,
  p.category_id,
  c.name                                   as category_name,
  p.unit,
  p.min_stock,
  p.price,
  p.expiry_date,
  p.supplier,
  p.barcode,
  p.created_at,
  p.updated_at,
  coalesce(s.total, 0)::numeric(12,3)      as quantity,
  coalesce(s.kitchen, 0)::numeric(12,3)    as kitchen_qty,
  coalesce(s.dine_in, 0)::numeric(12,3)    as dine_in_qty,
  case
    when coalesce(s.total, 0) <= 0 then 'out'
    when coalesce(s.total, 0) <= p.min_stock then 'low'
    else 'ok'
  end                                      as stock_status
from public.products p
left join public.categories c on c.id = p.category_id
left join lateral (
  select
    sum(ps.quantity)                                        as total,
    sum(ps.quantity) filter (where l.code = 'kitchen')      as kitchen,
    sum(ps.quantity) filter (where l.code = 'dine_in')      as dine_in
  from public.product_stock ps
  join public.locations l on l.id = ps.location_id
  where ps.product_id = p.id
) s on true
where p.archived_at is null;

create or replace view public.stock_movement_log with (security_invoker = true) as
select
  m.id,
  m.created_at,
  m.product_id,
  p.name        as product_name,
  p.unit,
  m.location_id,
  l.name        as location_name,
  m.type,
  m.method,
  m.quantity,
  m.delta,
  m.balance_after,
  m.expiry_date,
  m.note,
  m.user_id,
  pr.name       as user_name,
  m.sale_id,
  s.sale_no,
  m.transfer_id
from public.stock_movements m
join public.products p on p.id = m.product_id
join public.locations l on l.id = m.location_id
left join public.profiles pr on pr.id = m.user_id
left join public.sales s on s.id = m.sale_id;

-- ---------- Internal: apply one movement (NOT callable by clients) ----------
create or replace function public._apply_move(
  p_product_id  uuid,
  p_location_id uuid,
  p_type        public.movement_type,
  p_method      public.movement_method,
  p_quantity    numeric,
  p_note        text,
  p_expiry      date,
  p_sale_id     uuid,
  p_transfer_id uuid,
  p_clamp       boolean default false
) returns table (moved numeric, new_quantity numeric, movement_id bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_current numeric;
  v_delta   numeric;
  v_moved   numeric;
  v_new     numeric;
  v_id      bigint;
begin
  insert into public.product_stock (product_id, location_id, quantity)
  values (p_product_id, p_location_id, 0)
  on conflict (product_id, location_id) do nothing;

  select ps.quantity into v_current
  from public.product_stock ps
  where ps.product_id = p_product_id and ps.location_id = p_location_id
  for update;

  if p_type in ('in', 'transfer_in') then
    v_moved := p_quantity;
    v_delta := p_quantity;
  else
    if p_quantity > v_current then
      if p_clamp then
        v_moved := v_current;
      else
        raise exception 'Not enough stock: only % available.', trim(to_char(v_current, 'FM999999990.###'))
          using errcode = 'P0001';
      end if;
    else
      v_moved := p_quantity;
    end if;
    v_delta := -v_moved;
  end if;

  v_new := v_current + v_delta;

  if v_moved > 0 then
    update public.product_stock
       set quantity = v_new, updated_at = now()
     where product_id = p_product_id and location_id = p_location_id;

    insert into public.stock_movements
      (product_id, location_id, type, method, quantity, delta, balance_after,
       expiry_date, note, user_id, sale_id, transfer_id)
    values
      (p_product_id, p_location_id, p_type, p_method, v_moved, v_delta, v_new,
       p_expiry, nullif(trim(p_note), ''), auth.uid(), p_sale_id, p_transfer_id)
    returning id into v_id;
  end if;

  -- keep the product's nearest expiry date up to date on stock-in
  if p_type = 'in' and p_expiry is not null then
    update public.products pr
       set expiry_date = case
             when pr.expiry_date is null or v_current <= 0 then p_expiry
             else least(pr.expiry_date, p_expiry)
           end
     where pr.id = p_product_id;
  end if;

  return query select v_moved, v_new, v_id;
end $$;

revoke all on function public._apply_move(uuid, uuid, public.movement_type, public.movement_method, numeric, text, date, uuid, uuid, boolean) from public;

-- ---------- Stock in / out (manual or scan) ----------
create or replace function public.stock_move(
  p_product_id  uuid,
  p_type        text,
  p_quantity    numeric,
  p_method      text default 'manual',
  p_note        text default null,
  p_expiry      date default null,
  p_location_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_role public.app_role := public.current_app_role();
  v_loc  uuid := coalesce(p_location_id, public.home_location_id());
  v_res  record;
  v_name text;
  v_unit text;
begin
  if v_role is null then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if p_type not in ('in', 'out') then
    raise exception 'Type must be "in" or "out".' using errcode = '22023';
  end if;
  if p_method not in ('scan', 'manual') then
    raise exception 'Method must be "scan" or "manual".' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 100000 then
    raise exception 'Quantity must be greater than 0.' using errcode = '22023';
  end if;
  if v_loc is null or not public.can_access_location(v_loc) then
    raise exception 'You cannot change stock at this location.' using errcode = '42501';
  end if;
  if p_note is not null and length(p_note) > 300 then
    raise exception 'Note is too long.' using errcode = '22023';
  end if;

  select name, unit into v_name, v_unit
  from public.products where id = p_product_id and archived_at is null;
  if not found then
    raise exception 'Product not found.' using errcode = 'P0002';
  end if;

  select * into v_res from public._apply_move(
    p_product_id, v_loc, p_type::public.movement_type, p_method::public.movement_method,
    round(p_quantity, 3), p_note, case when p_type = 'in' then p_expiry end, null, null, false);

  return jsonb_build_object(
    'product_id', p_product_id,
    'product_name', v_name,
    'unit', v_unit,
    'location_id', v_loc,
    'moved', v_res.moved,
    'quantity', v_res.new_quantity,
    'total_quantity', (select coalesce(sum(quantity), 0) from public.product_stock where product_id = p_product_id),
    'movement_id', v_res.movement_id
  );
end $$;

-- ---------- Transfer between locations (Phase 2) ----------
create or replace function public.transfer_stock(
  p_product_id uuid,
  p_from       uuid,
  p_to         uuid,
  p_quantity   numeric,
  p_note       text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tid uuid := gen_random_uuid();
  v_out record;
  v_in  record;
begin
  if public.current_app_role() is null then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  if p_from = p_to then
    raise exception 'Choose two different locations.' using errcode = '22023';
  end if;
  if not public.can_access_location(p_from) then
    raise exception 'You cannot move stock out of this location.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.locations where id = p_to) then
    raise exception 'Destination not found.' using errcode = 'P0002';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 100000 then
    raise exception 'Quantity must be greater than 0.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and archived_at is null) then
    raise exception 'Product not found.' using errcode = 'P0002';
  end if;

  -- lock both rows in a stable order to avoid deadlocks
  insert into public.product_stock (product_id, location_id) values (p_product_id, p_from), (p_product_id, p_to)
  on conflict do nothing;
  perform 1 from public.product_stock
   where product_id = p_product_id and location_id in (p_from, p_to)
   order by location_id for update;

  select * into v_out from public._apply_move(p_product_id, p_from, 'transfer_out', 'transfer', round(p_quantity, 3), p_note, null, null, v_tid, false);
  select * into v_in  from public._apply_move(p_product_id, p_to,   'transfer_in',  'transfer', round(p_quantity, 3), p_note, null, null, v_tid, false);

  return jsonb_build_object('transfer_id', v_tid, 'from_quantity', v_out.new_quantity, 'to_quantity', v_in.new_quantity);
end $$;

-- ---------- Record a sale + automatic recipe deduction ----------
-- p_items: [{"menu_item_id": "...", "quantity": 2}, ...]
-- Prices always come from the database. Ingredients are deducted from
-- the deduction location; if an ingredient runs short, the sale is still
-- recorded (it really happened), stock stops at 0 and a warning is returned.
create or replace function public.record_sale(
  p_items       jsonb,
  p_note        text default null,
  p_location_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_role     public.app_role := public.current_app_role();
  v_loc      uuid := coalesce(p_location_id, public.default_location_id());
  v_sale_id  uuid;
  v_sale_no  bigint;
  v_total    numeric(12,2);
  v_warnings jsonb := '[]'::jsonb;
  v_need     record;
  v_res      record;
  v_src      uuid;
  v_left     numeric(12,3);
begin
  if v_role is null or v_role not in ('owner', 'staff', 'dine_in') then
    raise exception 'Not authorized to record sales.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one item.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many lines in one sale.' using errcode = '22023';
  end if;
  if p_note is not null and length(p_note) > 300 then
    raise exception 'Note is too long.' using errcode = '22023';
  end if;

  drop table if exists _lines;
  create temp table _lines on commit drop as
  select (e ->> 'menu_item_id')::uuid as menu_item_id,
         sum((e ->> 'quantity')::int)  as quantity
  from jsonb_array_elements(p_items) e
  group by 1;

  if exists (select 1 from _lines where quantity is null or quantity <= 0 or quantity > 1000) then
    raise exception 'Quantities must be between 1 and 1000.' using errcode = '22023';
  end if;
  if exists (
    select 1 from _lines l left join public.menu_items m on m.id = l.menu_item_id and m.is_active
    where m.id is null
  ) then
    raise exception 'One or more menu items are unavailable.' using errcode = 'P0002';
  end if;

  select sum(round(m.price * l.quantity, 2)) into v_total
  from _lines l join public.menu_items m on m.id = l.menu_item_id;

  insert into public.sales (user_id, location_id, total, note)
  values (auth.uid(), v_loc, v_total, nullif(trim(p_note), ''))
  returning id, sale_no into v_sale_id, v_sale_no;

  insert into public.sale_items (sale_id, menu_item_id, quantity, unit_price, line_total)
  select v_sale_id, m.id, l.quantity, m.price, round(m.price * l.quantity, 2)
  from _lines l join public.menu_items m on m.id = l.menu_item_id;

  -- ingredient deduction (ordered by product id to avoid deadlocks)
  for v_need in
    select r.product_id, p.name, p.unit, sum(r.qty * l.quantity)::numeric(12,3) as needed
    from _lines l
    join public.recipes r on r.menu_item_id = l.menu_item_id
    join public.products p on p.id = r.product_id and p.archived_at is null
    group by r.product_id, p.name, p.unit
    order by r.product_id
  loop
    -- take from the sale's location first, then from the other locations
    -- (e.g. drinks kept at the front counter, chicken in the kitchen)
    v_left := v_need.needed;
    for v_src in
      select l.id from public.locations l
      left join public.product_stock ps on ps.location_id = l.id and ps.product_id = v_need.product_id
      order by (l.id = v_loc) desc, coalesce(ps.quantity, 0) desc, l.code
    loop
      exit when v_left <= 0;
      select * into v_res from public._apply_move(
        v_need.product_id, v_src, 'sale', 'sale', v_left,
        'Sale #' || v_sale_no, null, v_sale_id, null, true);
      v_left := v_left - v_res.moved;
    end loop;

    if v_left > 0 then
      v_warnings := v_warnings || jsonb_build_object(
        'product_id', v_need.product_id,
        'product_name', v_need.name,
        'unit', v_need.unit,
        'needed', v_need.needed,
        'deducted', v_need.needed - v_left,
        'short', v_left);
    end if;
  end loop;

  return jsonb_build_object('sale_id', v_sale_id, 'sale_no', v_sale_no, 'total', v_total, 'warnings', v_warnings);
end $$;

-- ---------- Create product (+ opening stock) in one transaction ----------
create or replace function public.create_product(
  p_name        text,
  p_category_id uuid,
  p_unit        text,
  p_min_stock   numeric,
  p_price       numeric,
  p_expiry      date,
  p_supplier    text,
  p_barcode     text,
  p_quantity    numeric default 0,
  p_location_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id  uuid;
  v_loc uuid := coalesce(p_location_id, public.default_location_id());
begin
  if not public.is_owner() then
    raise exception 'Only the Owner can add products.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 100000 then
    raise exception 'Invalid opening quantity.' using errcode = '22023';
  end if;
  if nullif(trim(p_barcode), '') is not null and exists (
    select 1 from public.products where barcode = trim(p_barcode) and archived_at is null
  ) then
    raise exception 'Barcode % is already used by another product.', trim(p_barcode) using errcode = '23505';
  end if;

  insert into public.products (name, category_id, unit, min_stock, price, expiry_date, supplier, barcode, created_by)
  values (trim(p_name), p_category_id, trim(p_unit), coalesce(p_min_stock, 0), coalesce(p_price, 0),
          p_expiry, nullif(trim(p_supplier), ''), nullif(trim(p_barcode), ''), auth.uid())
  returning id into v_id;

  insert into public.product_stock (product_id, location_id)
  select v_id, id from public.locations
  on conflict do nothing;

  if p_quantity > 0 then
    perform public._apply_move(v_id, v_loc, 'in', 'manual', round(p_quantity, 3), 'Opening stock', p_expiry, null, null, false);
  end if;

  return v_id;
end $$;

-- ---------- Delete product (archive if it has history) ----------
create or replace function public.delete_product(p_product_id uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception 'Only the Owner can delete products.' using errcode = '42501';
  end if;
  if exists (select 1 from public.recipes where product_id = p_product_id) then
    raise exception 'This product is used in a menu recipe. Remove it from the recipe first.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.stock_movements where product_id = p_product_id) then
    update public.products set archived_at = now() where id = p_product_id and archived_at is null;
    return 'archived';
  end if;
  delete from public.products where id = p_product_id;
  return 'deleted';
end $$;

-- ---------- Generate barcodes for products without one ----------
create or replace function public.assign_barcodes(p_product_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int := 0;
  v_id    uuid;
  v_code  text;
begin
  if public.current_app_role() not in ('owner', 'staff') then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  for v_id in
    select id from public.products
    where id = any(p_product_ids) and barcode is null and archived_at is null
    order by name
  loop
    loop
      v_code := 'SA' || lpad(nextval('public.barcode_seq')::text, 8, '0');
      exit when not exists (select 1 from public.products where barcode = v_code)
            and not exists (select 1 from public.menu_items where barcode = v_code);
    end loop;
    update public.products set barcode = v_code where id = v_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- ---------- Save menu item + recipe in one transaction ----------
-- p_recipe: [{"product_id": "...", "qty": 0.25}, ...]
create or replace function public.save_menu_item(
  p_id          uuid,
  p_name        text,
  p_category_id uuid,
  p_price       numeric,
  p_barcode     text,
  p_is_active   boolean,
  p_recipe      jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_id;
begin
  if not public.is_owner() then
    raise exception 'Only the Owner can edit the menu.' using errcode = '42501';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'Invalid price.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_recipe, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid recipe.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.menu_items (name, category_id, price, barcode, is_active)
    values (trim(p_name), p_category_id, p_price, nullif(trim(p_barcode), ''), coalesce(p_is_active, true))
    returning id into v_id;
  else
    update public.menu_items
       set name = trim(p_name), category_id = p_category_id, price = p_price,
           barcode = nullif(trim(p_barcode), ''), is_active = coalesce(p_is_active, true)
     where id = v_id;
    if not found then
      raise exception 'Menu item not found.' using errcode = 'P0002';
    end if;
  end if;

  delete from public.recipes where menu_item_id = v_id;
  insert into public.recipes (menu_item_id, product_id, qty)
  select v_id, (e ->> 'product_id')::uuid, sum((e ->> 'qty')::numeric)
  from jsonb_array_elements(coalesce(p_recipe, '[]'::jsonb)) e
  group by 2;

  return v_id;
end $$;

-- ---------- Read helpers (security invoker: RLS applies) ----------
create or replace function public.dashboard_stats() returns jsonb
language sql stable security invoker set search_path = public as $$
  with today as (
    select (date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila') as start
  )
  select jsonb_build_object(
    'total_products', (select count(*) from public.product_inventory),
    'low_stock',      (select count(*) from public.product_inventory where stock_status in ('low', 'out')),
    'out_of_stock',   (select count(*) from public.product_inventory where stock_status = 'out'),
    'near_expiry',    (select count(*) from public.product_inventory
                        where expiry_date is not null and quantity > 0
                          and expiry_date <= (now() at time zone 'Asia/Manila')::date + 7),
    'today_sales',    (select coalesce(sum(total), 0) from public.sales, today where sold_at >= today.start),
    'today_orders',   (select count(*) from public.sales, today where sold_at >= today.start)
  )
$$;

create or replace function public.best_sellers(p_from timestamptz, p_to timestamptz, p_limit int default 50)
returns table (menu_item_id uuid, name text, category_name text, quantity bigint, revenue numeric)
language sql stable security invoker set search_path = public as $$
  select m.id, m.name, c.name, sum(si.quantity)::bigint, sum(si.line_total)
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  join public.menu_items m on m.id = si.menu_item_id
  left join public.categories c on c.id = m.category_id
  where s.sold_at >= p_from and s.sold_at < p_to
  group by m.id, m.name, c.name
  order by 4 desc, 5 desc
  limit least(greatest(p_limit, 1), 500)
$$;

-- ---------- Execute grants ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.current_app_role(), public.is_owner(), public.default_location_id(),
  public.can_access_location(uuid), public.home_location_id(),
  public.stock_move(uuid, text, numeric, text, text, date, uuid),
  public.transfer_stock(uuid, uuid, uuid, numeric, text),
  public.record_sale(jsonb, text, uuid),
  public.create_product(text, uuid, text, numeric, numeric, date, text, text, numeric, uuid),
  public.delete_product(uuid),
  public.assign_barcodes(uuid[]),
  public.save_menu_item(uuid, text, uuid, numeric, text, boolean, jsonb),
  public.dashboard_stats(),
  public.best_sellers(timestamptz, timestamptz, int)
to authenticated;
-- trigger functions run as definer; _apply_move is internal only
revoke execute on function public._apply_move(uuid, uuid, public.movement_type, public.movement_method, numeric, text, date, uuid, uuid, boolean) from authenticated;

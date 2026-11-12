-- =====================================================================
-- 003: Row Level Security. Permissions are enforced HERE, not only in UI.
--   owner   : everything
--   staff   : read all inventory/sales; stock + sales only via functions
--   kitchen : kitchen location only
--   dine_in : dine-in (front) location only
-- No table allows direct INSERT/UPDATE of stock, sales or movements:
-- those only change through the SECURITY DEFINER functions in 002.
-- =====================================================================

alter table public.locations        enable row level security;
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_stock    enable row level security;
alter table public.menu_items       enable row level security;
alter table public.recipes          enable row level security;
alter table public.sales            enable row level security;
alter table public.sale_items       enable row level security;
alter table public.stock_movements  enable row level security;

-- anon gets nothing at all
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- authenticated: table privileges are narrowed again by the policies below
grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.categories, public.products, public.menu_items, public.recipes, public.locations to authenticated;
grant update (name, username, role, location_id, active) on public.profiles to authenticated;
revoke insert, update, delete on public.product_stock, public.stock_movements, public.sales, public.sale_items from authenticated;

-- ---------- locations ----------
drop policy if exists locations_read on public.locations;
create policy locations_read on public.locations for select to authenticated
  using (public.current_app_role() is not null);
drop policy if exists locations_owner_write on public.locations;
create policy locations_owner_write on public.locations for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------- profiles ----------
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_app_role() is not null);
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------- categories ----------
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to authenticated
  using (public.current_app_role() is not null);
drop policy if exists categories_owner_write on public.categories;
create policy categories_owner_write on public.categories for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------- products ----------
drop policy if exists products_read on public.products;
create policy products_read on public.products for select to authenticated
  using (public.current_app_role() is not null);
drop policy if exists products_owner_insert on public.products;
create policy products_owner_insert on public.products for insert to authenticated
  with check (public.is_owner());
drop policy if exists products_owner_update on public.products;
create policy products_owner_update on public.products for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
drop policy if exists products_owner_delete on public.products;
create policy products_owner_delete on public.products for delete to authenticated
  using (public.is_owner());

-- ---------- product_stock (read only; writes via functions) ----------
drop policy if exists product_stock_read on public.product_stock;
create policy product_stock_read on public.product_stock for select to authenticated
  using (public.can_access_location(location_id));

-- ---------- menu_items / recipes ----------
drop policy if exists menu_items_read on public.menu_items;
create policy menu_items_read on public.menu_items for select to authenticated
  using (public.current_app_role() is not null);
drop policy if exists menu_items_owner_write on public.menu_items;
create policy menu_items_owner_write on public.menu_items for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists recipes_read on public.recipes;
create policy recipes_read on public.recipes for select to authenticated
  using (public.current_app_role() is not null);
drop policy if exists recipes_owner_write on public.recipes;
create policy recipes_owner_write on public.recipes for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------- sales / sale_items (read only; writes via record_sale) ----------
drop policy if exists sales_read on public.sales;
create policy sales_read on public.sales for select to authenticated
  using (public.current_app_role() in ('owner', 'staff') or user_id = auth.uid());

drop policy if exists sale_items_read on public.sale_items;
create policy sale_items_read on public.sale_items for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));

-- ---------- stock_movements (read only) ----------
drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements for select to authenticated
  using (
    public.is_owner()
    or (public.current_app_role() = 'staff' and user_id = auth.uid())
    or (public.current_app_role() in ('kitchen', 'dine_in') and public.can_access_location(location_id))
  );

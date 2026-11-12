-- =====================================================================
-- Seed data — Sizzling Aroma (Fried Chicken & Crispy Pata)
-- Safe to run more than once (uses ON CONFLICT / NOT EXISTS).
-- =====================================================================

-- ---------- Categories ----------
insert into public.categories (name, kind, sort_order) values
  ('Fried Chicken',        'menu', 1),
  ('Crispy Pata',          'menu', 2),
  ('Sides',                'menu', 3),
  ('Drinks',               'menu', 4),
  ('Meat & Poultry',       'ingredient', 10),
  ('Sauces & Condiments',  'ingredient', 11),
  ('Produce',              'ingredient', 12),
  ('Eggs & Dairy',         'ingredient', 13),
  ('Dry Goods',            'ingredient', 14),
  ('Oil & Frying',         'ingredient', 15),
  ('Beverages',            'ingredient', 16),
  ('Packaging & Supplies', 'supply', 20)
on conflict (name) do nothing;

-- ---------- Products (stock items) ----------
-- name, category, unit, min_stock, price (cost), expiry offset days (null = none), supplier, barcode, kitchen qty, dine-in qty
with data(name, category, unit, min_stock, price, expiry_days, supplier, barcode, kitchen_qty, dine_qty) as (values
  ('Chicken Thigh',            'Meat & Poultry',       'pcs',    40,  45.00,    4, 'Magnolia Chicken Station',   '4800110000011', 120,  0),
  ('Chicken Leg Quarter',      'Meat & Poultry',       'pcs',    30,  65.00,    4, 'Magnolia Chicken Station',   '4800110000028',  25,  0),
  ('Chicken Wings',            'Meat & Poultry',       'pcs',    40,  18.00,    3, 'Magnolia Chicken Station',   '4800110000035',  90,  0),
  ('Chicken Skin',             'Meat & Poultry',       'kg',      2, 180.00,    2, 'Magnolia Chicken Station',   '4800110000042',   5,  0),
  ('Pork Pata (Front Leg)',    'Meat & Poultry',       'pcs',     8, 320.00,    5, 'Monterey Meatshop',          '4800110000059',  14,  0),
  ('Pork Pata (Hind Leg)',     'Meat & Poultry',       'pcs',     6, 380.00,    5, 'Monterey Meatshop',          '4800110000066',   4,  0),
  ('Soy Sauce',                'Sauces & Condiments',  'L',       4,  48.00,  240, 'Silver Swan',                '4800024001017',  12,  2),
  ('Oyster Sauce',             'Sauces & Condiments',  'bottle',  3,  95.00,  300, 'Mama Sita''s',               '4800024002014',   6,  0),
  ('Cane Vinegar',             'Sauces & Condiments',  'L',       4,  42.00,  365, 'Datu Puti',                  '4800024003011',  10,  3),
  ('Banana Ketchup',           'Sauces & Condiments',  'bottle',  6,  58.00,  180, 'UFC',                        '4800024004018',   4,  6),
  ('Gravy Mix',                'Sauces & Condiments',  'pack',   10,  32.00,   10, 'McCormick',                  '4800024005015',  18,  0),
  ('Calamansi',                'Produce',              'kg',      2, 120.00,    6, 'Balintawak Market',          '4800330000013',   3,  1),
  ('Garlic',                   'Produce',              'kg',      2, 160.00,   20, 'Balintawak Market',          '4800330000020',   6,  0),
  ('Onion',                    'Produce',              'kg',      2, 140.00,   14, 'Balintawak Market',          '4800330000037',   1,  0),
  ('Lemongrass (Tanglad)',     'Produce',              'bundle',  3,  25.00,    5, 'Balintawak Market',          null,              8,  0),
  ('Atchara (Pickled Papaya)', 'Produce',              'jar',     4,  85.00,   45, 'Lola Remedios',              '4800330000044',  10,  2),
  ('Eggs',                     'Eggs & Dairy',         'pcs',    60,   9.00,   12, 'Bounty Fresh',               '4800440000016', 180,  0),
  ('Butter',                   'Eggs & Dairy',         'pack',    2,  95.00,   60, 'Magnolia',                   '4800440000023',   3,  0),
  ('Rice',                     'Dry Goods',            'kg',     25,  55.00,  180, 'NFA Partner Supplier',       '4800550000019',  75,  0),
  ('All-Purpose Flour',        'Dry Goods',            'kg',     10,  48.00,  120, 'Wellington Flour',           '4800550000026',  22,  0),
  ('Cornstarch',               'Dry Goods',            'kg',      3,  70.00,  200, 'Ram Foods',                  '4800550000033',   5,  0),
  ('Breading Mix',             'Dry Goods',            'kg',      5, 150.00,   90, 'Crispy Fry',                 '4800550000040',   2,  0),
  ('Salt',                     'Dry Goods',            'kg',      3,  30.00, null, 'Dona Elena',                 '4800550000057',   8,  0),
  ('Black Pepper',             'Dry Goods',            'kg',      1, 600.00,  365, 'McCormick',                  '4800550000064',   1,  0),
  ('Sugar',                    'Dry Goods',            'kg',      5,  85.00, null, 'Victorias',                  '4800550000071',  12,  2),
  ('Cooking Oil',              'Oil & Frying',         'L',      20,  95.00,  240, 'Minola',                     '4800660000012',  48,  0),
  ('Coke Mismo 295ml',         'Beverages',            'bottle', 24,  18.00,  150, 'Coca-Cola Beverages PH',     '4801981116089',   0, 60),
  ('Royal Mismo 295ml',        'Beverages',            'bottle', 24,  18.00,  150, 'Coca-Cola Beverages PH',     '4801981116096',   0, 18),
  ('Sprite Mismo 295ml',       'Beverages',            'bottle', 24,  18.00,  150, 'Coca-Cola Beverages PH',     '4801981116102',   0, 30),
  ('Coke 1.5L',                'Beverages',            'bottle', 12,  75.00,  150, 'Coca-Cola Beverages PH',     '4801981116119',   0, 20),
  ('Bottled Water 500ml',      'Beverages',            'bottle', 24,  12.00,  365, 'Nature''s Spring',           '4800770000018',   0, 48),
  ('Iced Tea Powder',          'Beverages',            'pack',    5,  65.00,  200, 'Nestea',                     '4800770000025',   2,  4),
  ('Takeout Box (Large)',      'Packaging & Supplies', 'pcs',    50,   6.00, null, 'Pack Pro',                   null,            200,  0),
  ('Paper Cup 16oz',           'Packaging & Supplies', 'pcs',    50,   3.50, null, 'Pack Pro',                   null,              0, 35)
)
insert into public.products (name, category_id, unit, min_stock, price, expiry_date, supplier, barcode)
select d.name, c.id, d.unit, d.min_stock, d.price,
       case when d.expiry_days is null then null else current_date + d.expiry_days end,
       d.supplier, d.barcode
from data d
join public.categories c on c.name = d.category
where not exists (select 1 from public.products p where p.name = d.name and p.archived_at is null);

-- Opening stock (one row per location) + an opening movement in the log
with data(name, kitchen_qty, dine_qty) as (values
  ('Chicken Thigh',120,0),('Chicken Leg Quarter',25,0),('Chicken Wings',90,0),('Chicken Skin',5,0),
  ('Pork Pata (Front Leg)',14,0),('Pork Pata (Hind Leg)',4,0),('Soy Sauce',12,2),('Oyster Sauce',6,0),
  ('Cane Vinegar',10,3),('Banana Ketchup',4,6),('Gravy Mix',18,0),('Calamansi',3,1),('Garlic',6,0),
  ('Onion',1,0),('Lemongrass (Tanglad)',8,0),('Atchara (Pickled Papaya)',10,2),('Eggs',180,0),
  ('Butter',3,0),('Rice',75,0),('All-Purpose Flour',22,0),('Cornstarch',5,0),('Breading Mix',2,0),
  ('Salt',8,0),('Black Pepper',1,0),('Sugar',12,2),('Cooking Oil',48,0),('Coke Mismo 295ml',0,60),
  ('Royal Mismo 295ml',0,18),('Sprite Mismo 295ml',0,30),('Coke 1.5L',0,20),('Bottled Water 500ml',0,48),
  ('Iced Tea Powder',2,4),('Takeout Box (Large)',200,0),('Paper Cup 16oz',0,35)
),
stock as (
  select p.id as product_id, l.id as location_id,
         case l.code when 'kitchen' then d.kitchen_qty else d.dine_qty end::numeric as qty
  from data d
  join public.products p on p.name = d.name and p.archived_at is null
  cross join public.locations l
),
ins as (
  insert into public.product_stock (product_id, location_id, quantity)
  select product_id, location_id, qty from stock
  on conflict (product_id, location_id) do nothing
  returning product_id, location_id, quantity
)
insert into public.stock_movements (product_id, location_id, type, method, quantity, delta, balance_after, note)
select product_id, location_id, 'in', 'manual', quantity, quantity, quantity, 'Opening stock (seed)'
from ins where quantity > 0;

-- ---------- Menu items ----------
with data(name, category, price, barcode) as (values
  ('Fried Chicken 1pc w/ Rice',     'Fried Chicken', 129.00, '2000000000015'),
  ('Fried Chicken 2pc w/ Rice',     'Fried Chicken', 229.00, '2000000000022'),
  ('Fried Chicken Bucket 6pc',      'Fried Chicken', 599.00, '2000000000039'),
  ('Chicken Wings 6pc',             'Fried Chicken', 249.00, '2000000000046'),
  ('Crispy Pata Regular',           'Crispy Pata',   649.00, '2000000000053'),
  ('Crispy Pata Jumbo',             'Crispy Pata',   849.00, '2000000000060'),
  ('Crispy Pata Solo Meal',         'Crispy Pata',   219.00, '2000000000077'),
  ('Plain Rice',                    'Sides',          25.00, '2000000000084'),
  ('Garlic Rice',                   'Sides',          35.00, '2000000000091'),
  ('Chicken Skin Chicharon',        'Sides',          99.00, '2000000000107'),
  ('Atchara',                       'Sides',          30.00, '2000000000114'),
  ('Extra Gravy',                   'Sides',          15.00, '2000000000121'),
  ('Coke Mismo',                    'Drinks',         30.00, '2000000000138'),
  ('Royal Mismo',                   'Drinks',         30.00, '2000000000145'),
  ('Sprite Mismo',                  'Drinks',         30.00, '2000000000152'),
  ('Coke 1.5L',                     'Drinks',        110.00, '2000000000169'),
  ('Bottled Water',                 'Drinks',         25.00, '2000000000176'),
  ('House Iced Tea',                'Drinks',         45.00, '2000000000183'),
  ('Calamansi Juice',               'Drinks',         55.00, '2000000000190')
)
insert into public.menu_items (name, category_id, price, barcode)
select d.name, c.id, d.price, d.barcode
from data d join public.categories c on c.name = d.category
on conflict (name) do nothing;

-- ---------- Recipes (quantity of each ingredient per serving) ----------
with data(menu, product, qty) as (values
  ('Fried Chicken 1pc w/ Rice', 'Chicken Thigh',        1),
  ('Fried Chicken 1pc w/ Rice', 'Breading Mix',         0.04),
  ('Fried Chicken 1pc w/ Rice', 'Eggs',                 0.25),
  ('Fried Chicken 1pc w/ Rice', 'Cooking Oil',          0.05),
  ('Fried Chicken 1pc w/ Rice', 'Rice',                 0.12),
  ('Fried Chicken 1pc w/ Rice', 'Gravy Mix',            0.05),
  ('Fried Chicken 2pc w/ Rice', 'Chicken Thigh',        2),
  ('Fried Chicken 2pc w/ Rice', 'Breading Mix',         0.08),
  ('Fried Chicken 2pc w/ Rice', 'Eggs',                 0.5),
  ('Fried Chicken 2pc w/ Rice', 'Cooking Oil',          0.1),
  ('Fried Chicken 2pc w/ Rice', 'Rice',                 0.12),
  ('Fried Chicken 2pc w/ Rice', 'Gravy Mix',            0.08),
  ('Fried Chicken Bucket 6pc',  'Chicken Thigh',        3),
  ('Fried Chicken Bucket 6pc',  'Chicken Leg Quarter',  3),
  ('Fried Chicken Bucket 6pc',  'Breading Mix',         0.25),
  ('Fried Chicken Bucket 6pc',  'Eggs',                 1.5),
  ('Fried Chicken Bucket 6pc',  'Cooking Oil',          0.3),
  ('Fried Chicken Bucket 6pc',  'Takeout Box (Large)',  1),
  ('Chicken Wings 6pc',         'Chicken Wings',        6),
  ('Chicken Wings 6pc',         'Breading Mix',         0.06),
  ('Chicken Wings 6pc',         'Cooking Oil',          0.08),
  ('Chicken Wings 6pc',         'Soy Sauce',            0.02),
  ('Crispy Pata Regular',       'Pork Pata (Front Leg)', 1),
  ('Crispy Pata Regular',       'Soy Sauce',            0.05),
  ('Crispy Pata Regular',       'Cane Vinegar',         0.08),
  ('Crispy Pata Regular',       'Garlic',               0.03),
  ('Crispy Pata Regular',       'Onion',                0.03),
  ('Crispy Pata Regular',       'Cooking Oil',          0.5),
  ('Crispy Pata Regular',       'Salt',                 0.02),
  ('Crispy Pata Regular',       'Black Pepper',         0.005),
  ('Crispy Pata Jumbo',         'Pork Pata (Hind Leg)', 1),
  ('Crispy Pata Jumbo',         'Soy Sauce',            0.06),
  ('Crispy Pata Jumbo',         'Cane Vinegar',         0.1),
  ('Crispy Pata Jumbo',         'Garlic',               0.04),
  ('Crispy Pata Jumbo',         'Onion',                0.04),
  ('Crispy Pata Jumbo',         'Cooking Oil',          0.6),
  ('Crispy Pata Jumbo',         'Salt',                 0.03),
  ('Crispy Pata Solo Meal',     'Pork Pata (Front Leg)', 0.25),
  ('Crispy Pata Solo Meal',     'Rice',                 0.12),
  ('Crispy Pata Solo Meal',     'Cane Vinegar',         0.02),
  ('Crispy Pata Solo Meal',     'Cooking Oil',          0.12),
  ('Plain Rice',                'Rice',                 0.12),
  ('Garlic Rice',               'Rice',                 0.12),
  ('Garlic Rice',               'Garlic',               0.01),
  ('Garlic Rice',               'Cooking Oil',          0.01),
  ('Chicken Skin Chicharon',    'Chicken Skin',         0.15),
  ('Chicken Skin Chicharon',    'Cornstarch',           0.02),
  ('Chicken Skin Chicharon',    'Cooking Oil',          0.05),
  ('Atchara',                   'Atchara (Pickled Papaya)', 0.1),
  ('Extra Gravy',               'Gravy Mix',            0.05),
  ('Coke Mismo',                'Coke Mismo 295ml',     1),
  ('Royal Mismo',               'Royal Mismo 295ml',    1),
  ('Sprite Mismo',              'Sprite Mismo 295ml',   1),
  ('Coke 1.5L',                 'Coke 1.5L',            1),
  ('Bottled Water',             'Bottled Water 500ml',  1),
  ('House Iced Tea',            'Iced Tea Powder',      0.05),
  ('House Iced Tea',            'Sugar',                0.02),
  ('House Iced Tea',            'Calamansi',            0.02),
  ('Calamansi Juice',           'Calamansi',            0.08),
  ('Calamansi Juice',           'Sugar',                0.03)
)
insert into public.recipes (menu_item_id, product_id, qty)
select m.id, p.id, d.qty
from data d
join public.menu_items m on m.name = d.menu
join public.products p on p.name = d.product and p.archived_at is null
on conflict (menu_item_id, product_id) do nothing;

-- ---------- Sample sales history (last 30 days) for Best Sellers & Reports ----------
-- Inserted directly as history (no stock deduction). New sales recorded in the
-- app go through record_sale() and DO deduct ingredients.
do $$
declare
  v_day   int;
  v_n     int;
  v_sale  uuid;
  v_item  record;
  v_qty   int;
  v_loc   uuid := (select id from public.locations where is_default);
begin
  if exists (select 1 from public.sales where note = 'Sample data') then
    return;
  end if;
  perform setseed(0.42);
  for v_day in 0..29 loop
    for v_n in 1..(4 + floor(random() * 6))::int loop
      insert into public.sales (sold_at, location_id, total, note)
      values (date_trunc('day', now()) - make_interval(days => v_day) + make_interval(hours => 10 + floor(random() * 11)::int, mins => floor(random() * 60)::int),
              v_loc, 0, 'Sample data')
      returning id into v_sale;

      for v_item in
        select id, price, name from public.menu_items
        order by random() * case
          when name like 'Fried Chicken 1pc%' then 0.2
          when name like 'Crispy Pata Regular%' then 0.3
          when name like 'Fried Chicken 2pc%' then 0.35
          when name like 'Coke Mismo%' then 0.3
          when name like 'Plain Rice%' then 0.4
          else 1 end
        limit (1 + floor(random() * 3))::int
      loop
        v_qty := 1 + floor(random() * 3)::int;
        insert into public.sale_items (sale_id, menu_item_id, quantity, unit_price, line_total)
        values (v_sale, v_item.id, v_qty, v_item.price, v_item.price * v_qty);
      end loop;

      update public.sales s set total = (select sum(line_total) from public.sale_items where sale_id = s.id)
      where s.id = v_sale;
    end loop;
  end loop;
end $$;

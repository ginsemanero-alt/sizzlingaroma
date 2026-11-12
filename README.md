# Sizzling Aroma — Restaurant Products Monitoring System

Inventory, barcode scanning, expiry tracking, sales and reports for **Sizzling Aroma — Fried Chicken & Crispy Pata Restaurant**.

**Stack:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Supabase (Postgres + Auth + RLS) · zod · sonner · @zxing/browser · JsBarcode · jsPDF. Deploys to Vercel.

---

## 1. Setup

### 1.1 Requirements
- Node.js **20.6+** (22 recommended)
- A Supabase project
- Optional: `psql` (PostgreSQL client) if you want to run migrations from your computer

### 1.2 Install
```bash
npm install
cp .env.example .env.local
```

### 1.3 Environment variables (`.env.local`, and the same in Vercel → Settings → Environment Variables)

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys | `sb_publishable_…` (or the legacy anon key). Safe in the browser. |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret keys | `sb_secret_…` (or the legacy `service_role` key). **Server only.** Needed for the Users page and `create-owner`. |
| `NEXT_PUBLIC_USERNAME_DOMAIN` | your choice | Username `maria` signs in as `maria@<domain>`. Default `staff.sizzlingaroma.local`. |
| `DATABASE_URL` | Supabase → Connect → Session pooler | Only for `npm run db:*`. URL-encode special characters in the password (`?` → `%3F`, `=` → `%3D`, `@` → `%40`). |

> Never commit `.env.local` (it is git-ignored). Never prefix the secret key with `NEXT_PUBLIC_`.

### 1.4 Create the database (choose one)

**A. SQL Editor (easiest).** Open Supabase → SQL Editor, paste the contents of **`supabase/setup.sql`** and click Run. It contains all migrations **and** the seed data, and it is safe to run more than once.

**B. From your computer with psql:**
```bash
npm run db:migrate    # schema, functions, RLS
npm run db:seed       # categories, products, menu, recipes, sample sales
# or both at once:
npm run db:setup
```

**C. Supabase CLI:** `supabase link --project-ref <ref>`, then `supabase db push`. Then run `supabase/seed.sql` in the SQL Editor.

After editing anything in `supabase/migrations/` or `seed.sql`, regenerate the all-in-one file with `npm run db:bundle`.

### 1.5 Recommended Supabase Auth settings
- Authentication → Sign In / Providers → **turn off "Allow new users to sign up"**. Accounts are created by the Owner.
- Users created without a role (for example, by public sign-up) start **inactive** and can't see any data until the Owner enables them.

### 1.6 Create the first Owner account (choose one)

**A. Script** (needs `SUPABASE_SECRET_KEY`):
```bash
npm run create-owner -- owner@yourmail.com "a-strong-password" "Owner Name"
# or with a username instead of an email:
npm run create-owner -- owner "a-strong-password" "Owner Name"
```

**B. Dashboard.** In Authentication → Users → **Add user**, enter an email and password and tick *Auto Confirm User*. Then edit the email in `supabase/bootstrap-owner.sql` and run that file in the SQL Editor.

Once the Owner exists, add every other account from the **Users** page in the app.

### 1.7 Run
```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # production build (also lints + type-checks)
```

### 1.8 Deploy to Vercel
1. Push the repo to GitHub and import it in Vercel. The framework is detected as Next.js.
2. Add the environment variables from 1.3. `DATABASE_URL` is not needed on Vercel.
3. Deploy. Camera scanning requires HTTPS, which Vercel provides.

---

## 2. Roles & permissions

Permissions are enforced **in the database** (Row Level Security plus `SECURITY DEFINER` functions that check the caller's role). The UI hides navigation as a convenience only.

| Page | Owner | Staff | Kitchen* | Dine-in* |
|---|:-:|:-:|:-:|:-:|
| Dashboard, Search | ✅ | ✅ | | |
| Products: view and update stock | ✅ | ✅ | | |
| Products: add, edit, delete | ✅ | | | |
| Inventory, Scan In/Out, Expiry | ✅ | ✅ | own location | own location |
| Stock Movement Log | ✅ all | own entries (DB) | own location | own location |
| Record Sale, Best Sellers, Barcode Labels | ✅ | ✅ | | |
| Reports, Menu & Recipes, Users | ✅ | | | |

\*Phase 2 roles, already working: Kitchen users only see and change Kitchen stock, and Dine-in users only see and change Front stock.

Database guarantees:
- No role can `INSERT`/`UPDATE` stock, sales or the movement log directly. They change only through `stock_move`, `transfer_stock`, `record_sale` and `create_product`. Each of these runs as **one transaction** that updates stock **and** writes the `stock_movements` row together.
- Stock can never go below zero (a `CHECK` constraint plus a row lock with `SELECT … FOR UPDATE`).
- Prices and totals for sales are read from `menu_items` in the database. The client only sends item IDs and quantities.
- A role comes only from `app_metadata`, which only the secret key can set. A user can't change their own role, and the last active Owner can't be demoted or disabled.

---

## 3. Using barcode scanners

### USB / Bluetooth scanner (keyboard-wedge)
1. Plug the scanner in. It types like a keyboard and presses **Enter** at the end, which is the default on almost every scanner.
2. Open **Scan In/Out**, choose **Stock In** or **Stock Out**, and scan. The scan field stays focused. If focus is lost, just start scanning again and keystrokes are redirected to it.
3. The product appears with its current stock. Set the quantity (scanning the same item again adds +1), an optional expiry date (Stock In) and a note, then press **Enter** or **Save**.
4. **Quick mode** saves 1 unit per scan with no extra step, which is good for counting deliveries.
5. If the barcode doesn't exist, the Owner sees **Create new product** with the barcode pre-filled.

### Phone camera
1. Open the site on your phone over **HTTPS** (your Vercel URL).
2. Tap **Scan with camera** and allow camera access. Point the camera at the barcode and it is read automatically (the phone vibrates). It supports EAN-13/8, UPC, Code 128, Code 39, QR and more.
3. If the camera can't read a code, type it into the scan field and press **Enter** (or **Find**).

### Items without a barcode
Open **Barcode Labels**, keep the "No barcode" filter, select the items and click **Generate** to assign unique `SA…` Code 128 codes. Then choose the number of copies and whether to show the expiry date, and click **Print**. The label sheet uses print-friendly CSS (3 columns on A4; works on label paper).

### Record Sale
Menu items can also be scanned. Menu barcodes come from Menu & Recipes. Scanning a product barcode, such as a bottled Coke, adds the menu item that sells exactly that product.

---

## 4. How stock is calculated
- Stock is stored **per product per location** (`product_stock`: Kitchen, Dine-in). Totals shown in the app are the sum across locations.
- **Recording a sale** deducts each recipe ingredient × quantity sold. It takes from the sale's location (Kitchen by default) first, then from the other location (for example, drinks kept at the front). If an ingredient runs out, the sale is still saved, because it really happened. Stock stops at 0 and the app shows a "short by …" warning so someone can recount.
- **Expiry:** a product's expiry date is the nearest one received. Stock In with an earlier expiry updates it, and once stock reaches 0 the next delivery's date replaces it.
- **Delete product:** a product with history is archived, so it is hidden but its log is kept. A product with no history is deleted. A product used in a recipe has to be removed from the recipe first.
- Times are shown and grouped in **Asia/Manila**.

---

## 5. Project structure
```
supabase/
  migrations/…001_schema.sql      tables, enums, indexes, new-user trigger, locations
  migrations/…002_functions.sql   role helpers, views, transactional functions
  migrations/…003_rls.sql         grants + RLS policies
  seed.sql                        real menu, ingredients, recipes, barcodes, 30 days of sample sales
  setup.sql                       all of the above in one file (generated)
  bootstrap-owner.sql             promote a dashboard-created user to Owner
scripts/                          db runner, SQL bundler, create-owner
src/middleware.ts                 session refresh + auth redirect
src/lib/                          supabase clients, auth/permissions, zod schemas, reports, utils
src/app/actions/                  server actions (validate with zod → call DB function)
src/app/(app)/…                   pages (dashboard, products, scan, labels, inventory, movements,
                                  expiry, sales/new, best-sellers, reports, menu, users, search)
src/components/                   UI kit, navigation, scanners, dialogs
```

---

## 6. Status

### Done
- Login with email **or** username, role-based redirect, inactive-account handling, middleware protection
- Dashboard with live stats, best sellers, low-stock and expiring lists, and global search across products and sales
- Products: search, category and status filters, OK/Low/Out badges; Owner add/edit/delete; Staff stock updates
- Scan In/Out: USB scanner plus phone camera plus manual entry, quick mode, create-on-not-found, toasts with the new quantity, no negative stock
- Barcode label generation (Code 128) and printable label sheets
- Inventory per location with manual in/out and Kitchen ↔ Dine-in transfers
- Stock Movement Log with product/user/type/method/date filters, pagination and per-product added/deducted totals
- Expiry tracking (expired, ≤3, ≤7, ≤14 days)
- Record Sale (tap or scan, running total, DB-priced) with **automatic recipe deduction** (Phase 2 feature, already live)
- Best Sellers (this week / this month / last 30 days)
- Reports (Owner): sales, inventory, expiry, movements, with date range, preview, PDF, CSV and print
- Menu & Recipes editor and Users management (create, role, enable/disable, reset password)
- Kitchen and Dine-in roles enforced in RLS
- Mobile bottom nav plus desktop sidebar, skeletons, empty states, error boundary

### Left / ideas for next
- Batch-level expiry (several expiry dates per product) instead of the nearest date per product
- Void/refund a sale (reverse the deductions)
- Purchase orders and supplier management
- Automated end-to-end tests against a Supabase test project
- Realtime dashboard updates (Supabase Realtime) and low-stock push/email alerts
- Optional QR labels (Code 128 is implemented)

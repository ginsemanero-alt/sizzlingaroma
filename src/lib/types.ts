export type AppRole = "owner" | "staff" | "kitchen" | "dine_in";
export type MovementType = "in" | "out" | "sale" | "transfer_in" | "transfer_out";
export type MovementMethod = "scan" | "manual" | "sale" | "transfer";
export type StockStatus = "ok" | "low" | "out";
export type CategoryKind = "ingredient" | "menu" | "supply";

export interface Profile {
  id: string;
  name: string;
  username: string | null;
  role: AppRole;
  location_id: string | null;
  active: boolean;
  created_at: string;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  sort_order: number;
}

/** Row of the `product_inventory` view. */
export interface ProductRow {
  id: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  unit: string;
  min_stock: number;
  price: number;
  expiry_date: string | null;
  supplier: string | null;
  barcode: string | null;
  created_at: string;
  updated_at: string;
  quantity: number;
  kitchen_qty: number;
  dine_in_qty: number;
  stock_status: StockStatus;
}

export interface MenuItem {
  id: string;
  name: string;
  category_id: string | null;
  price: number;
  barcode: string | null;
  is_active: boolean;
}

export interface RecipeLine {
  id: string;
  menu_item_id: string;
  product_id: string;
  qty: number;
}

/** Row of the `stock_movement_log` view. */
export interface MovementRow {
  id: number;
  created_at: string;
  product_id: string;
  product_name: string;
  unit: string;
  location_id: string;
  location_name: string;
  type: MovementType;
  method: MovementMethod;
  quantity: number;
  delta: number;
  balance_after: number;
  expiry_date: string | null;
  note: string | null;
  user_id: string | null;
  user_name: string | null;
  sale_id: string | null;
  sale_no: number | null;
  transfer_id: string | null;
}

export interface DashboardStats {
  total_products: number;
  low_stock: number;
  out_of_stock: number;
  near_expiry: number;
  today_sales: number;
  today_orders: number;
}

export interface BestSellerRow {
  menu_item_id: string;
  name: string;
  category_name: string | null;
  quantity: number;
  revenue: number;
}

export interface StockMoveResult {
  product_id: string;
  product_name: string;
  unit: string;
  location_id: string;
  moved: number;
  quantity: number;
  total_quantity: number;
  movement_id: number | null;
}

export interface SaleWarning {
  product_id: string;
  product_name: string;
  unit: string;
  needed: number;
  deducted: number;
  short: number;
}

export interface SaleResult {
  sale_id: string;
  sale_no: number;
  total: number;
  warnings: SaleWarning[];
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

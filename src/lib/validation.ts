import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max, `Max ${max} characters`).optional().transform((v) => (v ? v : null));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date");

export const barcodeSchema = z
  .string()
  .trim()
  .min(3, "Barcode is too short")
  .max(64, "Barcode is too long")
  .regex(/^[A-Za-z0-9\-.]+$/, "Only letters, numbers, - and .");

const quantity = (max = 100000) =>
  z.coerce.number({ error: "Enter a number" }).positive("Must be greater than 0").max(max, "Too large");

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  category_id: z.string().optional().transform((v) => (v ? v : null)).pipe(z.uuid().nullable()),
  unit: z.string().trim().min(1, "Unit is required").max(20),
  quantity: z.coerce.number({ error: "Enter a number" }).min(0, "Cannot be negative").max(100000).default(0),
  min_stock: z.coerce.number({ error: "Enter a number" }).min(0, "Cannot be negative").max(100000),
  price: z.coerce.number({ error: "Enter a number" }).min(0, "Cannot be negative").max(10_000_000),
  expiry_date: optionalDate,
  supplier: optionalText(120),
  barcode: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(barcodeSchema.nullable()),
});
export type ProductInput = z.input<typeof productSchema>;

export const stockMoveSchema = z.object({
  product_id: z.uuid(),
  type: z.enum(["in", "out"]),
  quantity: quantity(),
  method: z.enum(["scan", "manual"]),
  note: optionalText(300),
  expiry_date: optionalDate,
  location_id: z.string().optional().transform((v) => (v ? v : null)).pipe(z.uuid().nullable()),
});
export type StockMoveInput = z.input<typeof stockMoveSchema>;

export const transferSchema = z
  .object({
    product_id: z.uuid(),
    from: z.uuid({ error: "Choose a location" }),
    to: z.uuid({ error: "Choose a location" }),
    quantity: quantity(),
    note: optionalText(300),
  })
  .refine((v) => v.from !== v.to, { message: "Choose two different locations", path: ["to"] });
export type TransferInput = z.input<typeof transferSchema>;

export const saleSchema = z.object({
  items: z
    .array(z.object({ menu_item_id: z.uuid(), quantity: z.coerce.number().int().min(1).max(1000) }))
    .min(1, "Add at least one item")
    .max(100),
  note: optionalText(300),
});
export type SaleInput = z.input<typeof saleSchema>;

export const menuItemSchema = z.object({
  id: z.string().optional().transform((v) => (v ? v : null)).pipe(z.uuid().nullable()),
  name: z.string().trim().min(1, "Name is required").max(120),
  category_id: z.string().optional().transform((v) => (v ? v : null)).pipe(z.uuid().nullable()),
  price: z.coerce.number({ error: "Enter a price" }).min(0, "Cannot be negative").max(1_000_000),
  barcode: z.string().trim().optional().transform((v) => (v ? v : null)).pipe(barcodeSchema.nullable()),
  is_active: z.boolean().default(true),
  recipe: z
    .array(z.object({ product_id: z.uuid({ error: "Choose an ingredient" }), qty: quantity(10000) }))
    .max(50)
    .default([]),
});
export type MenuItemInput = z.input<typeof menuItemSchema>;

export const ROLES = ["owner", "staff", "kitchen", "dine_in"] as const;

export const newUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  login: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "At least 3 characters")
    .max(120)
    .refine((v) => v.includes("@") ? z.email().safeParse(v).success : /^[a-z0-9._-]{3,32}$/.test(v), "Use an email or a username (a-z, 0-9, . _ -)"),
  password: z.string().min(8, "At least 8 characters").max(72),
  role: z.enum(ROLES),
});
export type NewUserInput = z.input<typeof newUserSchema>;

export const updateUserSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  role: z.enum(ROLES),
  active: z.boolean(),
});

export const loginSchema = z.object({
  login: z.string().trim().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
});

/** Turn a ZodError into { field: firstMessage }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

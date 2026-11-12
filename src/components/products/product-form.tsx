"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { createProduct, updateProduct } from "@/app/actions/products";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldErrors as zodFieldErrors, productSchema, type ProductInput } from "@/lib/validation";
import type { Category } from "@/lib/types";

const UNITS = ["pcs", "kg", "g", "L", "ml", "pack", "bottle", "can", "box", "tray", "jar", "bundle", "sack"];

export interface ProductFormValues {
  name: string;
  category_id: string;
  unit: string;
  quantity: string;
  min_stock: string;
  price: string;
  expiry_date: string;
  supplier: string;
  barcode: string;
}

export function ProductForm({
  mode,
  productId,
  initial,
  categories,
  returnTo = "/products",
}: {
  mode: "create" | "edit";
  productId?: string;
  initial?: Partial<ProductFormValues>;
  categories: Category[];
  returnTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");

  const submit = (fd: FormData) => {
    const values: ProductInput = {
      name: String(fd.get("name") ?? ""),
      category_id: String(fd.get("category_id") ?? ""),
      unit: String(fd.get("unit") ?? ""),
      quantity: mode === "create" ? String(fd.get("quantity") || "0") : "0",
      min_stock: String(fd.get("min_stock") || "0"),
      price: String(fd.get("price") || "0"),
      expiry_date: String(fd.get("expiry_date") ?? ""),
      supplier: String(fd.get("supplier") ?? ""),
      barcode,
    };
    const local = productSchema.safeParse(values);
    if (!local.success) {
      setErrors(zodFieldErrors(local.error));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    start(async () => {
      const res = mode === "create" ? await createProduct(values) : await updateProduct(productId!, values);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Saved.");
      router.push(returnTo);
      router.refresh();
    });
  };

  const err = (k: string) => errors[k];
  const aria = (k: string) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <form action={submit} className="card space-y-6 rounded-[2.5rem] p-6 sm:p-8" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Product name" error={err("name")} className="sm:col-span-2">
          <input id="name" name="name" className="input" defaultValue={initial?.name} required maxLength={120} autoFocus {...aria("name")} />
        </Field>
        <Field id="category_id" label="Category" error={err("category_id")}>
          <select id="category_id" name="category_id" className="input" defaultValue={initial?.category_id ?? ""}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field id="unit" label="Unit" error={err("unit")}>
          <input id="unit" name="unit" list="unit-options" className="input" defaultValue={initial?.unit ?? "pcs"} required maxLength={20} {...aria("unit")} />
          <datalist id="unit-options">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        </Field>
        {mode === "create" && (
          <Field id="quantity" label="Opening quantity" error={err("quantity")} hint="Added to the Kitchen and logged as a stock-in.">
            <input id="quantity" name="quantity" type="number" inputMode="decimal" step="any" min="0" className="input" defaultValue={initial?.quantity ?? "0"} {...aria("quantity")} />
          </Field>
        )}
        <Field id="min_stock" label="Minimum stock level" error={err("min_stock")} hint="Shows a Low badge at or below this.">
          <input id="min_stock" name="min_stock" type="number" inputMode="decimal" step="any" min="0" className="input" defaultValue={initial?.min_stock ?? "0"} {...aria("min_stock")} />
        </Field>
        <Field id="price" label="Unit cost / price (₱)" error={err("price")}>
          <input id="price" name="price" type="number" inputMode="decimal" step="0.01" min="0" className="input" defaultValue={initial?.price ?? "0"} {...aria("price")} />
        </Field>
        <Field id="expiry_date" label="Expiry date" error={err("expiry_date")}>
          <input id="expiry_date" name="expiry_date" type="date" className="input" defaultValue={initial?.expiry_date ?? ""} {...aria("expiry_date")} />
        </Field>
        <Field id="supplier" label="Supplier" error={err("supplier")}>
          <input id="supplier" name="supplier" className="input" defaultValue={initial?.supplier ?? ""} maxLength={120} {...aria("supplier")} />
        </Field>
        <Field id="barcode" label="Barcode" error={err("barcode")} hint="Scan with a USB scanner, type it, or leave empty and generate one later in Labels." className="sm:col-span-2">
          <div className="flex gap-2">
            <input
              id="barcode"
              name="barcode"
              className="input font-mono"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                // USB scanners send Enter at the end — don't submit the form by accident
                if (e.key === "Enter") e.preventDefault();
              }}
              maxLength={64}
              autoComplete="off"
              {...aria("barcode")}
            />
            {!barcode && (
              <button
                type="button"
                className="btn-soft shrink-0"
                onClick={() => setBarcode(`SA${Date.now().toString().slice(-10)}`)}
                title="Generate a unique internal barcode"
              >
                <Sparkles className="size-4" /> Generate
              </button>
            )}
          </div>
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={returnTo} className="btn-ghost">Cancel</Link>
        <SubmitButton pending={pending}>{mode === "create" ? "Add product" : "Save changes"}</SubmitButton>
      </div>
    </form>
  );
}

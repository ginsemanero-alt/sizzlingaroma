"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChefHat, Pencil, Plus, Trash2 } from "lucide-react";
import { saveMenuItem } from "@/app/actions/menu";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatPeso, formatQty } from "@/lib/utils";

export interface MenuRow {
  id: string;
  name: string;
  category_id: string | null;
  price: number;
  barcode: string | null;
  is_active: boolean;
  recipes: { product_id: string; qty: number }[];
}
type Product = { id: string; name: string; unit: string };
type Line = { key: number; product_id: string; qty: string };

export function MenuManager({ items, products, categories }: { items: MenuRow[]; products: Product[]; categories: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState<MenuRow | "new" | null>(null);
  const productById = new Map(products.map((p) => [p.id, p]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setEditing("new")}><Plus className="size-4" /> Add menu item</button>
      </div>
      {items.length === 0 ? (
        <div className="card"><EmptyState icon={<ChefHat className="size-7" />} title="No menu items" description="Add your first dish to start recording sales." /></div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((m) => (
            <li key={m.id} className={cn("card flex flex-col p-5", !m.is_active && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-muted">{(m.category_id && catName.get(m.category_id)) || "Menu"}</p>
                  <h2 className="font-black leading-tight">{m.name}</h2>
                  <p className="font-mono text-xs text-muted">{m.barcode ?? "no barcode"}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary">{formatPeso(m.price)}</p>
                  {!m.is_active && <span className="badge bg-sand text-muted">Hidden</span>}
                </div>
              </div>
              <div className="mt-3 flex-1">
                {m.recipes.length === 0 ? (
                  <p className="rounded-2xl bg-warn-soft px-3 py-2 text-xs font-semibold text-warn">No recipe — sales won&apos;t deduct stock.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {m.recipes.map((r) => {
                      const p = productById.get(r.product_id);
                      return <li key={r.product_id} className="rounded-full bg-cream px-2.5 py-1 text-xs"><strong>{formatQty(r.qty)} {p?.unit}</strong> {p?.name ?? "?"}</li>;
                    })}
                  </ul>
                )}
              </div>
              <button type="button" className="btn-ghost mt-4 w-full" onClick={() => setEditing(m)}><Pencil className="size-4" /> Edit</button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <MenuEditor
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          products={products}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function MenuEditor({ item, products, categories, onClose }: { item: MenuRow | null; products: Product[]; categories: { id: string; name: string }[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Line[]>(() => (item?.recipes ?? []).map((r, i) => ({ key: i, product_id: r.product_id, qty: String(r.qty) })));
  const [active, setActive] = useState(item?.is_active ?? true);
  const nextKey = () => Math.max(0, ...lines.map((l) => l.key)) + 1;
  const unitOf = (id: string) => products.find((p) => p.id === id)?.unit ?? "";

  const submit = (fd: FormData) =>
    start(async () => {
      const res = await saveMenuItem({
        id: item?.id ?? "",
        name: String(fd.get("name") ?? ""),
        category_id: String(fd.get("category_id") ?? ""),
        price: String(fd.get("price") ?? ""),
        barcode: String(fd.get("barcode") ?? ""),
        is_active: active,
        recipe: lines.filter((l) => l.product_id || l.qty).map((l) => ({ product_id: l.product_id, qty: l.qty })),
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      onClose();
      router.refresh();
    });

  return (
    <Modal open onClose={onClose} title={item ? `Edit ${item.name}` : "New menu item"}>
      <form action={submit} className="space-y-4" noValidate>
        <Field id="mi-name" label="Name" error={errors.name}>
          <input id="mi-name" name="name" className="input" defaultValue={item?.name} maxLength={120} required aria-invalid={!!errors.name} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="mi-cat" label="Category">
            <select id="mi-cat" name="category_id" className="input" defaultValue={item?.category_id ?? ""}>
              <option value="">—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field id="mi-price" label="Price (₱)" error={errors.price}>
            <input id="mi-price" name="price" type="number" step="0.01" min="0" inputMode="decimal" className="input" defaultValue={item?.price} required aria-invalid={!!errors.price} />
          </Field>
          <Field id="mi-barcode" label="Barcode (optional)" error={errors.barcode}>
            <input id="mi-barcode" name="barcode" className="input font-mono" defaultValue={item?.barcode ?? ""} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} />
          </Field>
          <label className="mt-6 flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-5 accent-[#FF5A1F]" /> Available for sale
          </label>
        </div>
        <fieldset className="rounded-3xl bg-cream p-4">
          <legend className="sr-only">Recipe</legend>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-black">Recipe <span className="font-semibold text-muted">(per serving)</span></p>
            <button type="button" className="btn-soft !px-3 !py-1.5 text-xs" onClick={() => setLines((l) => [...l, { key: nextKey(), product_id: "", qty: "" }])}><Plus className="size-3.5" /> Ingredient</button>
          </div>
          {lines.length === 0 && <p className="py-2 text-xs text-muted">No ingredients — sales of this item won&apos;t change stock.</p>}
          <ul className="space-y-2">
            {lines.map((l, i) => (
              <li key={l.key} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <label htmlFor={`r-p-${l.key}`} className="sr-only">Ingredient {i + 1}</label>
                  <select id={`r-p-${l.key}`} className="input !py-2" value={l.product_id} aria-invalid={!!errors[`recipe.${i}.product_id`]} onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, product_id: e.target.value } : x)))}>
                    <option value="">Choose ingredient…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                  </select>
                </div>
                <div className="w-28">
                  <label htmlFor={`r-q-${l.key}`} className="sr-only">Quantity {unitOf(l.product_id)}</label>
                  <input id={`r-q-${l.key}`} type="number" step="any" min="0" inputMode="decimal" placeholder={unitOf(l.product_id) || "qty"} className="input !py-2" value={l.qty} aria-invalid={!!errors[`recipe.${i}.qty`]} onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, qty: e.target.value } : x)))} />
                </div>
                <button type="button" className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-bad-soft hover:text-bad" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label={`Remove ingredient ${i + 1}`}><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
          {Object.keys(errors).some((k) => k.startsWith("recipe")) && <p className="field-error">Each ingredient needs a product and a quantity above 0.</p>}
        </fieldset>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <SubmitButton pending={pending}>Save</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

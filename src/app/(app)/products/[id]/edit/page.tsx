import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries";
import type { ProductRow } from "@/lib/types";
import { formatQty } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/components/products/product-form";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireAccess("products");
  if (profile.role !== "owner") redirect("/products");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data }, categories] = await Promise.all([
    supabase.from("product_inventory").select("*").eq("id", id).maybeSingle<ProductRow>(),
    getCategories(["ingredient", "supply"]),
  ]);
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit product" subtitle={`${data.name} · ${formatQty(data.quantity)} ${data.unit} in stock (change stock from Inventory or Scan)`} />
      <ProductForm
        mode="edit"
        productId={data.id}
        categories={categories}
        initial={{
          name: data.name,
          category_id: data.category_id ?? "",
          unit: data.unit,
          min_stock: String(data.min_stock),
          price: String(data.price),
          expiry_date: data.expiry_date ?? "",
          supplier: data.supplier ?? "",
          barcode: data.barcode ?? "",
        }}
      />
    </div>
  );
}

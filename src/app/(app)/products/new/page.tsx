import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCategories } from "@/lib/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/components/products/product-form";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ barcode?: string; from?: string }> }) {
  const { profile } = await requireAccess("products");
  if (profile.role !== "owner") redirect("/products");
  const sp = await searchParams;
  const categories = await getCategories(["ingredient", "supply"]);
  const barcode = (sp.barcode ?? "").replace(/[^A-Za-z0-9\-.]/g, "").slice(0, 64);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add product" subtitle={barcode ? `New product for scanned barcode ${barcode}` : "Add a stock item or ingredient"} />
      <ProductForm mode="create" categories={categories} initial={{ barcode }} returnTo={sp.from === "scan" ? "/scan" : "/products"} />
    </div>
  );
}

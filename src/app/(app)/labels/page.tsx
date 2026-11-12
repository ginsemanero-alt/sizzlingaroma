import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { LabelSheet } from "./label-sheet";

export const metadata: Metadata = { title: "Barcode Labels" };

export default async function LabelsPage() {
  await requireAccess("labels");
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_inventory").select("id, name, unit, barcode, expiry_date, category_name").order("name");
  if (error) throw new Error(error.message);
  return (
    <div>
      <div className="no-print">
        <PageHeader title="Barcode Labels" subtitle="Generate Code 128 barcodes for items without one and print a label sheet." />
      </div>
      <LabelSheet products={(data ?? []) as Pick<ProductRow, "id" | "name" | "unit" | "barcode" | "expiry_date" | "category_name">[]} />
    </div>
  );
}

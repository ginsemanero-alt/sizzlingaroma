"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import { deleteProduct } from "@/app/actions/products";
import { Modal } from "@/components/ui/modal";
import { StockAdjustDialog, type AdjustTarget } from "@/components/stock-adjust-dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Location } from "@/lib/types";

export function ProductRowActions({
  product,
  isOwner,
  locations,
  defaultLocationId,
}: {
  product: AdjustTarget;
  isOwner: boolean;
  locations: Location[];
  defaultLocationId: string;
}) {
  const router = useRouter();
  const [adjust, setAdjust] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  const doDelete = () =>
    start(async () => {
      const res = await deleteProduct(product.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setConfirm(false);
      router.refresh();
    });

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button type="button" className="btn-soft !px-3 !py-2 text-xs" onClick={() => setAdjust(true)} aria-label={`Update stock for ${product.name}`}>
        <ArrowLeftRight className="size-4" /> <span className="hidden sm:inline">Stock</span>
      </button>
      {isOwner && (
        <>
          <Link href={`/products/${product.id}/edit`} className="btn-ghost !px-3 !py-2" aria-label={`Edit ${product.name}`}>
            <Pencil className="size-4" />
          </Link>
          <button type="button" className="btn-danger !px-3 !py-2" onClick={() => setConfirm(true)} aria-label={`Delete ${product.name}`}>
            <Trash2 className="size-4" />
          </button>
        </>
      )}
      <StockAdjustDialog product={adjust ? product : null} locations={locations} defaultLocationId={defaultLocationId} onClose={() => setAdjust(false)} />
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Delete product?">
        <p className="text-sm text-muted">
          <strong className="text-ink">{product.name}</strong> will be removed from the product list. Its stock-movement history is kept for reports.
        </p>
        <form action={doDelete} className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
          <SubmitButton pending={pending} className="btn bg-bad text-white">Delete</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}

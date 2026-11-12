"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { transferStock } from "@/app/actions/stock";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Location } from "@/lib/types";
import { formatQty } from "@/lib/utils";

export interface TransferTarget {
  id: string;
  name: string;
  unit: string;
  byLocation: Record<string, number>;
}

export function TransferDialog({
  product,
  fromOptions,
  allLocations,
  onClose,
}: {
  product: TransferTarget | null;
  fromOptions: Location[];
  allLocations: Location[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [from, setFrom] = useState(fromOptions[0]?.id ?? "");
  const toOptions = allLocations.filter((l) => l.id !== from);

  const submit = (fd: FormData) => {
    if (!product) return;
    start(async () => {
      const res = await transferStock({
        product_id: product.id,
        from,
        to: String(fd.get("to") ?? ""),
        quantity: String(fd.get("quantity") ?? ""),
        note: String(fd.get("note") ?? ""),
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(res.message, { description: product.name });
      setErrors({});
      onClose();
      router.refresh();
    });
  };

  return (
    <Modal open={!!product} onClose={onClose} title={product ? `Transfer · ${product.name}` : "Transfer"}>
      {product && (
        <form action={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="tr-from" label="From">
              <select id="tr-from" className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
                {fromOptions.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({formatQty(product.byLocation[l.id] ?? 0)} {product.unit})</option>
                ))}
              </select>
            </Field>
            <Field id="tr-to" label="To" error={errors.to}>
              <select id="tr-to" name="to" className="input" key={from}>
                {toOptions.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field id="tr-qty" label={`Quantity (${product.unit})`} error={errors.quantity}>
              <input id="tr-qty" name="quantity" type="number" inputMode="decimal" step="any" min="0" className="input" autoFocus aria-invalid={!!errors.quantity} />
            </Field>
            <Field id="tr-note" label="Note (optional)">
              <input id="tr-note" name="note" maxLength={300} className="input" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <SubmitButton pending={pending}>Transfer</SubmitButton>
          </div>
        </form>
      )}
    </Modal>
  );
}

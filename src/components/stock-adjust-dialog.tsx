"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { moveStock } from "@/app/actions/stock";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Location } from "@/lib/types";
import { cn, formatQty } from "@/lib/utils";

export interface AdjustTarget {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

export function StockAdjustDialog({
  product,
  initialType = "in",
  locations,
  defaultLocationId,
  onClose,
}: {
  product: AdjustTarget | null;
  initialType?: "in" | "out";
  locations: Location[];
  defaultLocationId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState<"in" | "out">(initialType);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [key, setKey] = useState(0);

  const close = () => {
    setErrors({});
    setKey((k) => k + 1);
    onClose();
  };

  const submit = (fd: FormData) => {
    if (!product) return;
    start(async () => {
      const res = await moveStock({
        product_id: product.id,
        type,
        quantity: String(fd.get("quantity") ?? ""),
        method: "manual",
        note: String(fd.get("note") ?? ""),
        expiry_date: String(fd.get("expiry_date") ?? ""),
        location_id: String(fd.get("location_id") ?? ""),
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(res.message, { description: `New stock: ${formatQty(res.data.total_quantity)} ${res.data.unit}` });
      close();
      router.refresh();
    });
  };

  return (
    <Modal open={!!product} onClose={close} title={product ? `Update stock · ${product.name}` : "Update stock"}>
      {product && (
        <form key={key} action={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-2 rounded-3xl bg-sand/60 p-1.5" role="radiogroup" aria-label="Direction">
            {(["in", "out"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-[1.1rem] py-3 text-sm font-black transition",
                  type === t ? (t === "in" ? "bg-ok text-white shadow-soft" : "bg-bad text-white shadow-soft") : "text-muted",
                )}
              >
                {t === "in" ? <Plus className="size-4" /> : <Minus className="size-4" />}
                Stock {t === "in" ? "In" : "Out"}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">
            Current stock: <strong className="text-ink">{formatQty(product.quantity)} {product.unit}</strong>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="adj-qty" label={`Quantity (${product.unit})`} error={errors.quantity}>
              <input id="adj-qty" name="quantity" type="number" inputMode="decimal" step="any" min="0" className="input" required autoFocus aria-invalid={!!errors.quantity} />
            </Field>
            <Field id="adj-loc" label="Location" error={errors.location_id}>
              <select id="adj-loc" name="location_id" className="input" defaultValue={defaultLocationId} disabled={locations.length < 2}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {locations.length < 2 && <input type="hidden" name="location_id" value={defaultLocationId} />}
            </Field>
          </div>
          {type === "in" && (
            <Field id="adj-exp" label="Expiry date (optional)" error={errors.expiry_date}>
              <input id="adj-exp" name="expiry_date" type="date" className="input" />
            </Field>
          )}
          <Field id="adj-note" label="Note (optional)" error={errors.note}>
            <input id="adj-note" name="note" maxLength={300} className="input" placeholder={type === "in" ? "e.g. Delivery from supplier" : "e.g. Spoiled / used for staff meal"} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
            <SubmitButton pending={pending} className={type === "in" ? "btn bg-ok text-white" : "btn bg-bad text-white"}>
              Save stock {type}
            </SubmitButton>
          </div>
        </form>
      )}
    </Modal>
  );
}

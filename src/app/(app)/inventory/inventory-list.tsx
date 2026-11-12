"use client";
import { useState } from "react";
import { ArrowLeftRight, Minus, Plus } from "lucide-react";
import { StockAdjustDialog, type AdjustTarget } from "@/components/stock-adjust-dialog";
import { TransferDialog, type TransferTarget } from "@/components/transfer-dialog";
import { StockBadge } from "@/components/ui/badges";
import type { Location, StockStatus } from "@/lib/types";
import { formatQty } from "@/lib/utils";

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  barcode: string | null;
  minStock: number;
  quantity: number;
  status: StockStatus;
  byLocation: Record<string, number>;
}

export function InventoryList({
  items,
  visibleLocations,
  allLocations,
  defaultLocationId,
}: {
  items: InventoryItem[];
  visibleLocations: Location[];
  allLocations: Location[];
  defaultLocationId: string;
}) {
  const [adjust, setAdjust] = useState<{ target: AdjustTarget; type: "in" | "out" } | null>(null);
  const [transfer, setTransfer] = useState<TransferTarget | null>(null);
  const canTransfer = allLocations.length > 1;

  const Actions = ({ p }: { p: InventoryItem }) => (
    <div className="flex items-center justify-end gap-1.5">
      <button type="button" className="btn !px-3 !py-2 bg-ok-soft text-ok hover:bg-[#bbf7d0]" onClick={() => setAdjust({ target: p, type: "in" })} aria-label={`Stock in ${p.name}`}>
        <Plus className="size-4" /> <span className="hidden sm:inline">In</span>
      </button>
      <button type="button" className="btn-danger !px-3 !py-2" onClick={() => setAdjust({ target: p, type: "out" })} aria-label={`Stock out ${p.name}`}>
        <Minus className="size-4" /> <span className="hidden sm:inline">Out</span>
      </button>
      {canTransfer && (
        <button type="button" className="btn-ghost !px-3 !py-2" onClick={() => setTransfer({ id: p.id, name: p.name, unit: p.unit, byLocation: p.byLocation })} aria-label={`Transfer ${p.name}`}>
          <ArrowLeftRight className="size-4" />
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="card hidden overflow-hidden lg:block">
        <table className="w-full">
          <caption className="sr-only">Inventory</caption>
          <thead className="bg-cream/60">
            <tr>
              <th scope="col" className="table-head">Product</th>
              {visibleLocations.map((l) => <th key={l.id} scope="col" className="table-head text-right">{l.name}</th>)}
              {visibleLocations.length > 1 && <th scope="col" className="table-head text-right">Total</th>}
              <th scope="col" className="table-head text-right">Min</th>
              <th scope="col" className="table-head">Status</th>
              <th scope="col" className="table-head"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-cream/50">
                <td className="table-cell">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-muted">{p.category ?? "Uncategorized"}</p>
                </td>
                {visibleLocations.map((l) => (
                  <td key={l.id} className="table-cell text-right tabular-nums">{formatQty(p.byLocation[l.id])} <span className="text-xs text-muted">{p.unit}</span></td>
                ))}
                {visibleLocations.length > 1 && <td className="table-cell text-right font-black tabular-nums">{formatQty(p.quantity)}</td>}
                <td className="table-cell text-right text-muted tabular-nums">{formatQty(p.minStock)}</td>
                <td className="table-cell"><StockBadge status={p.status} /></td>
                <td className="table-cell"><Actions p={p} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 lg:hidden">
        {items.map((p) => (
          <li key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold leading-tight">{p.name}</p>
                <p className="text-xs text-muted">{p.category ?? "Uncategorized"} · min {formatQty(p.minStock)} {p.unit}</p>
              </div>
              <StockBadge status={p.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleLocations.map((l) => (
                <span key={l.id} className="rounded-2xl bg-cream px-3 py-1.5 text-xs">
                  <span className="text-muted">{l.name}: </span><strong>{formatQty(p.byLocation[l.id])} {p.unit}</strong>
                </span>
              ))}
            </div>
            <div className="mt-3"><Actions p={p} /></div>
          </li>
        ))}
      </ul>

      <StockAdjustDialog
        key={adjust ? `${adjust.target.id}-${adjust.type}` : "none"}
        product={adjust?.target ?? null}
        initialType={adjust?.type}
        locations={visibleLocations}
        defaultLocationId={defaultLocationId}
        onClose={() => setAdjust(null)}
      />
      <TransferDialog
        key={transfer?.id ?? "none"}
        product={transfer}
        fromOptions={visibleLocations}
        allLocations={allLocations}
        onClose={() => setTransfer(null)}
      />
    </>
  );
}

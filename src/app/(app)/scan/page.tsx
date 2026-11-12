import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { getLocations, locationsForRole } from "@/lib/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ScanStation } from "./scan-station";

export const metadata: Metadata = { title: "Scan In / Out" };

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { profile } = await requireAccess("scan");
  const sp = await searchParams;
  const { allowed, defaultId } = locationsForRole(await getLocations(), profile.role);
  return (
    <div>
      <PageHeader title="Scan In / Out" subtitle="Scan with a USB scanner or your phone camera to add or remove stock." />
      <ScanStation
        locations={allowed}
        defaultLocationId={defaultId}
        canCreate={profile.role === "owner"}
        initialMode={sp.mode === "out" ? "out" : "in"}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireRole } from "@/server/auth";
import { db } from "@/lib/db";
import { MaintenanceForm } from "@/components/maintenance/maintenance-form";
import {
  searchMaintenanceAssets,
  type MaintenanceAssetHit,
} from "@/server/queries/maintenance";

export const metadata: Metadata = {
  title: "New Maintenance Record",
};

export default async function NewMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  await requireRole("ADMIN", "IT_STAFF");
  const { assetId } = await searchParams;

  let initialAsset: MaintenanceAssetHit | null = null;
  if (assetId) {
    const row = await db.asset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        assetTag: true,
        name: true,
        status: true,
        condition: true,
        serialNumber: true,
        brand: true,
        model: true,
        archivedAt: true,
        category: { select: { name: true } },
        _count: {
          select: {
            maintenanceRecords: {
              where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
            },
          },
        },
      },
    });
    if (
      row &&
      !row.archivedAt &&
      !["RETIRED", "DISPOSED", "MISSING"].includes(row.status)
    ) {
      initialAsset = {
        id: row.id,
        assetTag: row.assetTag,
        name: row.name,
        status: row.status,
        condition: row.condition,
        serialNumber: row.serialNumber,
        brand: row.brand,
        model: row.model,
        category: row.category,
        _count: row._count,
      };
    } else {
      initialAsset = (await searchMaintenanceAssets(assetId, 1))[0] ?? null;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/maintenance"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
        >
          <ArrowLeftIcon className="size-3.5" />
          Maintenance
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            New maintenance record
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Record a repair, inspection or service. The asset moves to “In
            maintenance” and can no longer be checked out until the record is
            completed or cancelled.
          </p>
        </div>
      </div>

      <MaintenanceForm
        initialAsset={initialAsset}
        cancelHref="/maintenance"
      />
    </div>
  );
}

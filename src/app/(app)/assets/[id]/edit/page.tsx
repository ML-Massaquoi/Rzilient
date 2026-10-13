import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { requireRole } from "@/server/auth";
import { getAssetDetail, getFormOptions } from "@/server/queries/assets";
import { updateAsset } from "@/server/actions/assets";
import { AssetForm } from "@/components/assets/asset-form";
import type { AssetStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Edit Asset",
};

const WORKFLOW_STATUSES: AssetStatus[] = ["CHECKED_OUT", "RETIRED", "DISPOSED"];

function isoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "IT_STAFF");

  const { id } = await params;
  const asset = await getAssetDetail(id);
  if (!asset) notFound();

  const options = await getFormOptions();
  const lockedStatus = WORKFLOW_STATUSES.includes(asset.status)
    ? asset.status
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href={`/assets/${asset.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to asset
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Edit asset
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            <span className="font-mono">{asset.assetTag}</span> · {asset.name}
          </p>
        </div>
      </div>

      <AssetForm
        action={updateAsset}
        mode="edit"
        assetId={asset.id}
        categories={options.categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        locations={options.locations}
        lockedStatus={lockedStatus}
        defaults={{
          name: asset.name,
          assetTag: asset.assetTag,
          categoryId: asset.categoryId,
          serialNumber: asset.serialNumber ?? "",
          brand: asset.brand ?? "",
          model: asset.model ?? "",
          description: asset.description ?? "",
          notes: asset.notes ?? "",
          status: asset.status,
          condition: asset.condition,
          locationId: asset.locationId ?? "",
          os: asset.os ?? "",
          fqdn: asset.fqdn ?? "",
          ethernetMac: asset.ethernetMac ?? "",
          wifiMac: asset.wifiMac ?? "",
          purchaseDate: isoDate(asset.purchaseDate),
          purchaseCost:
            asset.purchaseCost != null ? asset.purchaseCost.toString() : "",
          supplier: asset.supplier ?? "",
          warrantyEndsAt: isoDate(asset.warrantyEndsAt),
        }}
        cancelHref={`/assets/${asset.id}`}
      />
    </div>
  );
}

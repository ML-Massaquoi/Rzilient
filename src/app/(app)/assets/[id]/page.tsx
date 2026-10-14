import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRightLeftIcon,
  ArrowLeftIcon,
  BoxesIcon,
  CameraIcon,
  ClipboardCheckIcon,
  HistoryIcon,
  LayoutGridIcon,
  PencilIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { requireUser } from "@/server/auth";
import { getAssetDetail } from "@/server/queries/assets";
import { StatusBadge } from "@/components/assets/status-badge";
import { AssetComponents } from "@/components/assets/asset-components";
import {
  PhotoCaptureButton,
  PhotoGallery,
} from "@/components/attachments/photo-gallery";
import {
  AssetHistory,
  AssetMaintenance,
  AssetOverview,
} from "@/components/assets/detail-sections";
import { Button } from "@/components/ui/button";
import { CONDITION_LABELS } from "@/lib/labels";
import { SweetAlert } from "@/components/sweet-alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Asset",
};

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ just?: string; maintenance?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { just, maintenance } = await searchParams;
  const asset = await getAssetDetail(id);
  if (!asset) notFound();

  const canWrite = user.role !== "VIEWER";
  const photo = asset.attachments.find((item) => item.kind === "ASSET_PHOTO");
  const openMaintenance = asset.maintenanceRecords.filter(
    (record) => record.status === "OPEN" || record.status === "IN_PROGRESS"
  ).length;

  const custodian = asset.activeAssignment?.employee.fullName;
  const success =
    just === "deleted"
      ? {
          title: "Photo removed",
          description: "The photo was deleted from this asset.",
        }
      : just === "photo"
      ? {
          title: "Photos uploaded",
          description: `Your photos are now visible on ${asset.name}.`,
        }
      : just === "checked-out"
      ? {
          title: "Asset checked out successfully",
          description: custodian
            ? `${asset.name} is now assigned to ${custodian}.`
            : `${asset.name} is now checked out.`,
        }
      : just === "returned"
        ? {
            title: "Asset returned successfully",
            description:
              maintenance === "1"
                ? `${asset.name} was returned damaged and moved to maintenance.`
                : `${asset.name} is back in store and available.`,
          }
        : just === "transferred"
          ? {
              title: "Asset transferred successfully",
              description: custodian
                ? `Custody of ${asset.name} moved to ${custodian}.`
                : `Custody of ${asset.name} was transferred.`,
            }
          : just === "component-added"
            ? {
                title: "Component attached",
                description: `The component now appears under ${asset.name}'s Components list.`,
              }
            : just === "component-removed"
              ? {
                  title: "Component detached",
                  description: "The component is no longer linked to this device.",
                }
              : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <Link
        href="/assets"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeftIcon className="size-3.5" />
        All assets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="relative shrink-0">
            {photo ? (
              <a
                href={`/api/files/${photo.id}`}
                target="_blank"
                rel="noreferrer"
                className="block"
                title="View photo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${photo.id}`}
                  alt={asset.name}
                  className="border-border size-20 rounded-lg border object-cover sm:size-24"
                />
              </a>
            ) : (
              <div className="bg-muted border-border text-muted-foreground flex size-20 items-center justify-center rounded-lg border sm:size-24">
                <CameraIcon className="size-7" />
              </div>
            )}
            {canWrite ? (
              <PhotoCaptureButton
                entity="asset"
                entityId={asset.id}
                returnUrl={`/assets/${asset.id}`}
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground font-mono text-sm">
              {asset.assetTag}
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">
              {asset.name}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <StatusBadge status={asset.status} />
              <span className="text-muted-foreground text-sm">
                {CONDITION_LABELS[asset.condition]} condition
              </span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm">
                {asset.category.name}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && asset.status === "AVAILABLE" && !asset.activeAssignment ? (
            <Button render={<Link href={`/operations/check-out?asset=${asset.id}`} />}>
              <ClipboardCheckIcon />
              Check out
            </Button>
          ) : null}
          {canWrite && asset.activeAssignment ? (
            <>
              <Button
                render={
                  <Link
                    href={`/operations/returns?assignment=${asset.activeAssignment.id}`}
                  />
                }
              >
                <RotateCcwIcon />
                Return
              </Button>
              <Button
                variant="outline"
                render={
                  <Link
                    href={`/operations/transfers?assignment=${asset.activeAssignment.id}`}
                  />
                }
              >
                <ArrowRightLeftIcon />
                Transfer
              </Button>
            </>
          ) : null}
          {canWrite ? (
            <Button
              variant="outline"
              render={<Link href={`/assets/${asset.id}/edit`} />}
            >
              <PencilIcon />
              Edit asset
            </Button>
          ) : null}
        </div>
      </div>

      {success ? (
        <SweetAlert
          title={success.title}
          description={success.description}
        />
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutGridIcon />
            Overview
          </TabsTrigger>
          <TabsTrigger value="components">
            <BoxesIcon />
            Components
            {asset.children.length > 0 ? (
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {asset.children.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="history">
            <HistoryIcon />
            History
            <span className="text-muted-foreground ml-1 text-xs tabular-nums">
              {asset.transactions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <ShieldCheckIcon />
            Maintenance
            {openMaintenance > 0 ? (
              <span className="bg-status-maintenance/15 text-status-maintenance rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {openMaintenance}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="documents">
            <CameraIcon />
            Photos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" keepMounted className="mt-4">
          <AssetOverview asset={asset} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="components" keepMounted className="mt-4">
          <AssetComponents asset={asset} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="history" keepMounted className="mt-4">
          <AssetHistory transactions={asset.transactions} />
        </TabsContent>

        <TabsContent value="maintenance" keepMounted className="mt-4">
          <AssetMaintenance
            records={asset.maintenanceRecords}
            assetId={asset.id}
            canWrite={canWrite}
          />
        </TabsContent>

        <TabsContent value="documents" keepMounted className="mt-4">
          <PhotoGallery
            entity="asset"
            entityId={asset.id}
            photos={asset.attachments}
            canWrite={canWrite}
            returnUrl={`/assets/${asset.id}`}
            subject="device"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

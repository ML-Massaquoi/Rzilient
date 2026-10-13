"use client";

import Link from "next/link";
import {
  ChevronRightIcon,
  ClipboardCheckIcon,
  EyeIcon,
  LaptopIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/assets/status-badge";
import { formatDate } from "@/lib/datetime";
import type { AssetListItem } from "@/server/queries/assets";

function RowActions({
  asset,
  canWrite,
}: {
  asset: AssetListItem;
  canWrite: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${asset.assetTag}`}
            className="relative z-10"
          />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem render={<Link href={`/assets/${asset.id}`} />}>
          <EyeIcon />
          View details
        </DropdownMenuItem>
        {canWrite && asset.status === "AVAILABLE" && !asset.activeAssignment ? (
          <DropdownMenuItem
            render={<Link href={`/operations/check-out?asset=${asset.id}`} />}
          >
            <ClipboardCheckIcon />
            Check out
          </DropdownMenuItem>
        ) : null}
        {asset.activeAssignment && canWrite ? (
          <DropdownMenuItem
            render={
              <Link
                href={`/operations/returns?assignment=${asset.activeAssignment.id}`}
              />
            }
          >
            <RotateCcwIcon />
            Return
          </DropdownMenuItem>
        ) : null}
        {canWrite &&
        asset.status !== "RETIRED" &&
        asset.status !== "DISPOSED" ? (
          <DropdownMenuItem
            render={<Link href={`/maintenance/new?assetId=${asset.id}`} />}
          >
            <ShieldCheckIcon />
            Maintenance
          </DropdownMenuItem>
        ) : null}
        {canWrite ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href={`/assets/${asset.id}/edit`} />}
            >
              <PencilIcon />
              Edit asset
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssetList({
  items,
  canWrite,
}: {
  items: AssetListItem[];
  canWrite: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((asset) => {
        const photo = asset.attachments[0];
        const custodian = asset.activeAssignment?.employee;
        const custodianPhoto = custodian?.attachments[0];
        return (
          <li key={asset.id}>
            <div className="group bg-card border-border relative flex items-center gap-3 rounded-xl border p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <div className="border-border bg-muted flex size-11 shrink-0 items-center overflow-hidden rounded-lg border">
                {photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/files/${photo.id}`}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <LaptopIcon className="text-muted-foreground/60 size-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/assets/${asset.id}`}
                  className="rounded-sm text-sm font-semibold outline-none group-hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {asset.name}
                </Link>
                <span className="text-muted-foreground block truncate text-xs">
                  <span className="font-mono">{asset.assetTag}</span>
                  {asset.brand || asset.model
                    ? ` · ${[asset.brand, asset.model]
                        .filter(Boolean)
                        .join(" ")}`
                    : ""}
                  <span className="hidden sm:inline">
                    {" · "}
                    {asset.category.name}
                  </span>
                  <span className="hidden lg:inline">
                    {" · Registered "}
                    {formatDate(asset.createdAt)}
                  </span>
                </span>
              </div>

              <div className="hidden shrink-0 items-center gap-4 md:flex">
                <StatusBadge status={asset.status} />
                {custodian ? (
                  <div className="flex w-40 items-center gap-2">
                    {custodianPhoto ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/api/files/${custodianPhoto.id}`}
                        alt=""
                        className="border-border size-7 shrink-0 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full">
                        <UserRoundIcon className="size-3.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-medium">
                        {custodian.fullName}
                      </span>
                      <span className="text-muted-foreground block truncate text-[11px]">
                        {custodian.department.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground w-40 text-xs">
                    In store
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <span className="md:hidden">
                  <StatusBadge status={asset.status} />
                </span>
                <RowActions asset={asset} canWrite={canWrite} />
                <ChevronRightIcon className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

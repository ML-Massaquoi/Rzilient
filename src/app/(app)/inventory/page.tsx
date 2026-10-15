import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BoxesIcon,
  HistoryIcon,
  PackageIcon,
} from "lucide-react";
import { requireUser } from "@/server/auth";
import {
  listWarehousesWithCounts,
  type WarehouseCard,
} from "@/server/queries/warehouses";
import { getInventoryStats } from "@/server/queries/inventory";
import {
  PageHeader,
  StatCard,
  StatGrid,
  TILE_PALETTE,
  tileClassForKey,
} from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "cn";

export const metadata: Metadata = {
  title: "Warehouses",
};

function WarehouseTile({ warehouse }: { warehouse: WarehouseCard }) {
  const tile = tileClassForKey(warehouse.id + warehouse.name);
  return (
    <Link
      href={`/inventory/warehouses/${warehouse.id}`}
      className="group bg-card border-border rounded-xl border outline-none transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                tile
              )}
            >
              <BoxesIcon className="size-4.5" />
            </span>
            <span>
              <span className="block font-medium leading-tight group-hover:underline">
                {warehouse.name}
              </span>
              {warehouse.code ? (
                <span className="text-muted-foreground font-mono text-xs">
                  {warehouse.code}
                </span>
              ) : null}
            </span>
          </div>
          <ArrowRightIcon className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline" className="tabular-nums">
            <PackageIcon className="size-3" />
            {warehouse.deviceCount} devices
          </Badge>
          <Badge variant="outline" className="tabular-nums">
            {warehouse.stockItemCount} stock items
          </Badge>
          {warehouse.lowStockCount > 0 ? (
            <Badge
              variant="outline"
              className="bg-status-maintenance/15 text-status-maintenance tabular-nums"
            >
              <AlertTriangleIcon className="size-3" />
              {warehouse.lowStockCount} low
            </Badge>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default async function InventoryOverviewPage() {
  await requireUser();

  const [warehouses, stats] = await Promise.all([
    listWarehousesWithCounts(),
    getInventoryStats(),
  ]);

  const totalDevices = warehouses.reduce(
    (sum, warehouse) => sum + warehouse.deviceCount,
    0
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeader
        icon={BoxesIcon}
        iconClassName="bg-teal-500/15 text-teal-600 dark:text-teal-400"
        title="Warehouses"
        subtitle="Every device and stock item lives in a warehouse. Open one to see what it holds or transfer devices between warehouses."
        chips={[
          {
            label: "Devices",
            value: totalDevices,
            icon: PackageIcon,
          },
          {
            label: "Stock Items",
            value: stats.totalItems,
            icon: BoxesIcon,
          },
          {
            label: "Low Stock",
            value: stats.lowStock,
            icon: AlertTriangleIcon,
          },
        ]}
        actions={
          <>
            <Link
              href="/inventory/transactions"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <HistoryIcon />
              Stock transactions
            </Link>
            <Link href="/inventory/stock" className={cn(buttonVariants())}>
              <PackageIcon />
              All stock items
            </Link>
          </>
        }
      />

      <StatGrid cols={3}>
        <StatCard
          icon={PackageIcon}
          tileClassName={TILE_PALETTE[0]}
          label="Devices in warehouses"
          value={totalDevices}
          caption={`${warehouses.length} warehouses`}
        />
        <StatCard
          icon={BoxesIcon}
          tileClassName={TILE_PALETTE[1]}
          label="Stock items"
          value={stats.totalItems}
          caption="Across all warehouses"
        />
        <Link
          href={stats.lowStock > 0 ? "/inventory/stock?low=1" : "/inventory/stock"}
          className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard
            icon={AlertTriangleIcon}
            tileClassName={TILE_PALETTE[3]}
            label="Low stock"
            value={stats.lowStock}
            caption={
              stats.lowStock > 0 ? "Below configured minimum" : "All healthy"
            }
          />
        </Link>
      </StatGrid>

      {warehouses.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((warehouse) => (
            <WarehouseTile key={warehouse.id} warehouse={warehouse} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BoxesIcon}
          title="No warehouses configured"
          description="Run the database seed to create I.T Warehouse, Camp Warehouse and Camp WareHouse New."
        />
      )}
    </div>
  );
}

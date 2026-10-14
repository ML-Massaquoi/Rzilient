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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Warehouses",
};

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <CardContent className="px-4 py-3.5">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
      ) : null}
    </CardContent>
  );
  return href ? (
    <a
      href={href}
      className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card>{content}</Card>
    </a>
  ) : (
    <Card>{content}</Card>
  );
}

function WarehouseTile({ warehouse }: { warehouse: WarehouseCard }) {
  return (
    <Link
      href={`/inventory/warehouses/${warehouse.id}`}
      className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="transition-colors group-hover:border-foreground/30">
        <CardContent className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
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
        </CardContent>
      </Card>
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Warehouses
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every device and stock item lives in one of three warehouses.
            Open a warehouse to see what it holds or transfer devices between
            warehouses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/transactions"
            className="border-border hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors"
          >
            <HistoryIcon className="size-4" />
            Stock transactions
          </Link>
          <Link
            href="/inventory/stock"
            className="border-border hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors"
          >
            <PackageIcon className="size-4" />
            All stock items
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Devices in warehouses"
          value={String(totalDevices)}
          hint={`${warehouses.length} warehouses`}
        />
        <Stat label="Stock items" value={String(stats.totalItems)} />
        <Stat
          label="Low stock"
          value={String(stats.lowStock)}
          hint={
            stats.lowStock > 0 ? "Below configured minimum" : "All healthy"
          }
          href={stats.lowStock > 0 ? "/inventory/stock?low=1" : undefined}
        />
      </div>

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

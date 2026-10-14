import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, BoxesIcon, PackageIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/lib/db";
import { AssetStatus } from "@/generated/prisma/enums";
import {
  getWarehouse,
  listWarehouseAssets,
  listWarehouseOptions,
} from "@/server/queries/warehouses";
import {
  getInventoryFilterOptions,
  getLowStockItems,
  listInventoryItems,
} from "@/server/queries/inventory";
import { WarehouseDevices } from "@/components/inventory/warehouse-devices";
import { StockTable } from "@/components/inventory/stock-table";
import { StockFilters } from "@/components/inventory/stock-filters";
import { ItemDialog } from "@/components/inventory/item-dialog";
import { ListPagination } from "@/components/assets/list-pagination";
import { SweetAlert } from "@/components/sweet-alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Warehouse",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isActiveStatus(value: string): value is AssetStatus {
  return (Object.values(AssetStatus) as string[]).includes(value);
}

export default async function WarehouseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  const warehouse = await getWarehouse(id);
  if (!warehouse) notFound();

  const dq = first(sp.dq);
  const statusParam = first(sp.status) ?? "";
  const status = isActiveStatus(statusParam) ? statusParam : "";
  const q = first(sp.q);
  const category = first(sp.category);
  const lowOnly = first(sp.low) === "1";
  const just = first(sp.just);
  const movedCount = Number(first(sp.count) ?? "0");
  const skippedCount = Number(first(sp.skipped) ?? "0");
  const pageParam = Number(first(sp.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const tab = first(sp.tab) === "stock" ? "stock" : "devices";

  const canWrite = user.role !== "VIEWER";

  const [
    warehouses,
    devices,
    stockResult,
    lowItems,
    categories,
    locations,
    stockTotal,
  ] = await Promise.all([
    listWarehouseOptions(),
    listWarehouseAssets({ locationId: warehouse.id, q: dq, status, page }),
    listInventoryItems({ q, category, locationId: warehouse.id, page }),
    lowOnly ? getLowStockItems(50, warehouse.id) : Promise.resolve([]),
    getInventoryFilterOptions(),
    listWarehouseOptions(),
    db.inventoryItem.count({ where: { locationId: warehouse.id } }),
  ]);

  const stockItems = lowOnly ? lowItems : stockResult.items;

  const deviceSearch = new URLSearchParams();
  if (dq) deviceSearch.set("dq", dq);
  if (status) deviceSearch.set("status", status);
  const stockSearch = new URLSearchParams();
  if (q) stockSearch.set("q", q);
  if (category) stockSearch.set("category", category);
  if (lowOnly) stockSearch.set("low", "1");
  stockSearch.set("tab", "stock");

  const alert =
    just === "moved"
      ? {
          title: "Devices transferred",
          description: `${movedCount} device${movedCount === 1 ? "" : "s"} moved to ${warehouse.name}.${
            skippedCount > 0
              ? ` ${skippedCount} already ${skippedCount === 1 ? "was" : "were"} there.`
              : ""
          }`,
        }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/inventory"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeftIcon className="size-3.5" />
            Warehouses
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <BoxesIcon className="text-muted-foreground size-5" />
            {warehouse.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Devices and stock items stored in this warehouse. Transfer devices
            to another warehouse from the Devices tab.
          </p>
        </div>
        {canWrite ? (
          <ItemDialog
            mode="create"
            categories={categories}
            locations={locations}
            defaultLocationId={warehouse.id}
          />
        ) : null}
      </div>

      {alert ? (
        <SweetAlert title={alert.title} description={alert.description} />
      ) : null}

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="devices">
            <BoxesIcon />
            Devices
            <span className="text-muted-foreground ml-1 text-xs tabular-nums">
              {devices.total}
            </span>
          </TabsTrigger>
          <TabsTrigger value="stock">
            <PackageIcon />
            Stock items
            <span className="text-muted-foreground ml-1 text-xs tabular-nums">
              {stockTotal}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="mt-4">
          <div className="flex flex-col gap-4">
            <WarehouseDevices
              warehouseId={warehouse.id}
              warehouses={warehouses}
              items={devices.items}
              canWrite={canWrite}
              dq={dq}
              status={status}
            />
            {devices.total > 0 ? (
              <ListPagination
                page={devices.page}
                pageCount={devices.pageCount}
                total={devices.total}
                search={deviceSearch.toString()}
                basePath={`/inventory/warehouses/${warehouse.id}`}
                noun="devices"
              />
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <div className="flex flex-col gap-4">
            <StockFilters categories={categories} />
            {stockItems.length > 0 ? (
              <StockTable
                items={stockItems}
                canWrite={canWrite}
                categories={categories}
                locations={locations}
              />
            ) : lowOnly ? (
              <EmptyState
                icon={PackageIcon}
                title="No low-stock items here"
                description="Every item in this warehouse with a configured minimum is at or above its threshold."
              />
            ) : q || category ? (
              <EmptyState
                icon={PackageIcon}
                title="No stock items match these filters"
                description="Adjust the search or filters to widen the results."
              />
            ) : (
              <EmptyState
                icon={PackageIcon}
                title="No stock items in this warehouse"
                description={
                  canWrite
                    ? "Add the first quantity-based item (e.g. Cat6 cable) to start tracking stock."
                    : "Stock items created by the IT team will appear here."
                }
              />
            )}
            {!lowOnly && stockResult.total > 0 ? (
              <ListPagination
                page={stockResult.page}
                pageCount={stockResult.pageCount}
                total={stockResult.total}
                search={stockSearch.toString()}
                basePath={`/inventory/warehouses/${warehouse.id}`}
                noun="items"
              />
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

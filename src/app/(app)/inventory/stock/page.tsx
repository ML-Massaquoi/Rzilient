import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon, PackageIcon, PackageOpenIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import {
  getInventoryFilterOptions,
  getInventoryStats,
  getLowStockItems,
  listInventoryItems,
} from "@/server/queries/inventory";
import { listWarehouseOptions } from "@/server/queries/warehouses";
import { StockFilters } from "@/components/inventory/stock-filters";
import { StockTable } from "@/components/inventory/stock-table";
import { ItemDialog } from "@/components/inventory/item-dialog";
import { ListPagination } from "@/components/assets/list-pagination";
import {
  PageHeader,
  StatCard,
  StatGrid,
  TILE_PALETTE,
} from "@/components/layout/page-header";
import { SweetAlert } from "@/components/sweet-alert";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Inventory Stock",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const q = first(sp.q);
  const category = first(sp.category);
  const lowOnly = first(sp.low) === "1";
  const just = first(sp.just);
  const pageParam = Number(first(sp.page) ?? "1");

  const [result, lowItems, stats, categories, locations] = await Promise.all([
    listInventoryItems({
      q,
      category,
      page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    }),
    lowOnly ? getLowStockItems() : Promise.resolve([]),
    getInventoryStats(),
    getInventoryFilterOptions(),
    listWarehouseOptions(),
  ]);

  const canWrite = user.role !== "VIEWER";
  const hasFilters = Boolean(q || category || lowOnly);

  const activeParams = new URLSearchParams();
  if (q) activeParams.set("q", q);
  if (category) activeParams.set("category", category);
  const search = activeParams.toString();

  const success =
    just === "created"
      ? {
          title: "Stock item created",
          description: "Record its first delivery with a stock movement.",
        }
      : just === "updated"
        ? {
            title: "Stock item updated",
            description: "Item details were saved.",
          }
        : just === "transacted"
          ? {
              title: "Stock movement recorded",
              description:
                "The quantity changed and an immutable transaction was created.",
            }
          : null;

  const visibleItems = lowOnly ? lowItems : result.items;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeader
        icon={PackageIcon}
        iconClassName="bg-violet-500/15 text-violet-600 dark:text-violet-400"
        title="All stock items"
        subtitle={
          <>
            Quantity-based items like cables, connectors and peripherals. Every
            quantity change is recorded as a stock transaction.{" "}
            <a
              href="/inventory"
              className="text-foreground underline underline-offset-4"
            >
              View warehouses
            </a>
            .
          </>
        }
        chips={[
          { label: "Stock Items", value: stats.totalItems, icon: PackageIcon },
          { label: "Units On Hand", value: stats.totalUnits, icon: PackageOpenIcon },
          { label: "Low Stock", value: stats.lowStock, icon: AlertTriangleIcon },
        ]}
        actions={
          canWrite ? (
            <ItemDialog
              mode="create"
              categories={categories}
              locations={locations}
            />
          ) : null
        }
      />

      {success ? (
        <SweetAlert title={success.title} description={success.description} />
      ) : null}

      <StatGrid cols={3}>
        <StatCard
          icon={PackageIcon}
          tileClassName={TILE_PALETTE[2]}
          label="Stock items"
          value={stats.totalItems}
          caption="Tracked in inventory"
        />
        <StatCard
          icon={PackageOpenIcon}
          tileClassName={TILE_PALETTE[0]}
          label="Units on hand"
          value={stats.totalUnits}
          caption="Total quantity across items"
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
            caption={stats.lowStock > 0 ? "Below configured minimum" : "All healthy"}
          />
        </Link>
      </StatGrid>

      <StockFilters categories={categories} />

      {lowOnly && stats.lowStock === 0 ? (
        <EmptyState
          icon={PackageOpenIcon}
          title="No low-stock items"
          description="Every item with a configured minimum is at or above its threshold."
        />
      ) : visibleItems.length > 0 ? (
        <div className="flex flex-col gap-4">
          {lowOnly ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <AlertTriangleIcon className="text-status-maintenance size-4" />
              {lowItems.length} item{lowItems.length === 1 ? "" : "s"} below the
              configured minimum stock.
            </p>
          ) : null}
          <StockTable
            items={visibleItems}
            canWrite={canWrite}
            categories={categories}
            locations={locations}
          />
          {lowOnly ? null : (
            <ListPagination
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              search={search}
              basePath="/inventory"
              noun="items"
            />
          )}
        </div>
      ) : hasFilters ? (
        <EmptyState
          icon={PackageIcon}
          title="No stock items match these filters"
          description="Adjust the search or filters to widen the results."
        />
      ) : (
        <EmptyState
          icon={PackageIcon}
          title="No stock items yet"
          description={
            canWrite
              ? "Add the first quantity-based item (e.g. Cat6 cable) to start tracking stock."
              : "Stock items created by the IT team will appear here."
          }
        />
      )}
    </div>
  );
}

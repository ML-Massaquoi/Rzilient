import type { Metadata } from "next";
import Link from "next/link";
import {
  CircleCheckIcon,
  CoinsIcon,
  PlusIcon,
  WrenchIcon,
} from "lucide-react";
import { requireUser } from "@/server/auth";
import {
  getMaintenanceStats,
  listMaintenanceRecords,
} from "@/server/queries/maintenance";
import { MaintenanceFilters } from "@/components/maintenance/maintenance-filters";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import { ListPagination } from "@/components/assets/list-pagination";
import {
  PageHeader,
  StatCard,
  StatGrid,
  TILE_PALETTE,
} from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Maintenance",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const q = first(sp.q);
  const status = first(sp.status);
  const type = first(sp.type);
  const pageParam = Number(first(sp.page) ?? "1");

  const [result, stats] = await Promise.all([
    listMaintenanceRecords({
      q,
      status,
      type,
      page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    }),
    getMaintenanceStats(),
  ]);

  const canWrite = user.role !== "VIEWER";
  const hasFilters = Boolean(q || status || type);

  const activeParams = new URLSearchParams();
  if (q) activeParams.set("q", q);
  if (status) activeParams.set("status", status);
  if (type) activeParams.set("type", type);
  const search = activeParams.toString();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeader
        icon={WrenchIcon}
        iconClassName="bg-amber-500/15 text-amber-600 dark:text-amber-400"
        title="Maintenance"
        subtitle="Repairs, preventive servicing, inspections and warranty work across the fleet."
        chips={[
          { label: "Active Work", value: stats.active, icon: WrenchIcon },
          { label: "Completed", value: stats.completed, icon: CircleCheckIcon },
        ]}
        actions={
          canWrite ? (
            <Button render={<Link href="/maintenance/new" />}>
              <PlusIcon />
              New record
            </Button>
          ) : null
        }
      />

      <StatGrid>
        <StatCard
          icon={WrenchIcon}
          tileClassName={TILE_PALETTE[3]}
          label="Active work"
          value={stats.active}
          caption={`${stats.open} open · ${stats.inProgress} in progress`}
        />
        <StatCard
          icon={PlusIcon}
          tileClassName={TILE_PALETTE[1]}
          label="Open"
          value={stats.open}
          caption="Awaiting first action"
        />
        <StatCard
          icon={CircleCheckIcon}
          tileClassName={TILE_PALETTE[4]}
          label="Completed"
          value={stats.completed}
          caption={`${stats.cancelled} cancelled`}
        />
        <StatCard
          icon={CoinsIcon}
          tileClassName={TILE_PALETTE[2]}
          label="Completed cost"
          value={`SLE ${stats.totalCost.toString()}`}
          caption="Across completed records"
        />
      </StatGrid>

      <MaintenanceFilters />

      {result.items.length > 0 ? (
        <div className="flex flex-col gap-4">
          <MaintenanceTable items={result.items} canWrite={canWrite} />
          <ListPagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            search={search}
            basePath="/maintenance"
            noun="records"
          />
        </div>
      ) : hasFilters ? (
        <EmptyState
          icon={WrenchIcon}
          title="No maintenance records match these filters"
          description="Adjust the search or filters to widen the results."
        />
      ) : (
        <EmptyState
          icon={WrenchIcon}
          title="No maintenance records yet"
          description={
            canWrite
              ? "Create a record when an asset needs servicing — the asset will move into maintenance automatically."
              : "Maintenance records created by the IT team will appear here."
          }
        />
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, WrenchIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import {
  getMaintenanceStats,
  listMaintenanceRecords,
} from "@/server/queries/maintenance";
import { MaintenanceFilters } from "@/components/maintenance/maintenance-filters";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import { ListPagination } from "@/components/assets/list-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Maintenance",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="px-4 py-3.5">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
        {hint ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Maintenance
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Repairs, preventive servicing, inspections and warranty work across
            the fleet.
          </p>
        </div>
        {canWrite ? (
          <Button render={<Link href="/maintenance/new" />}>
            <PlusIcon />
            New record
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Active work"
          value={String(stats.active)}
          hint={`${stats.open} open · ${stats.inProgress} in progress`}
        />
        <Stat label="Open" value={String(stats.open)} />
        <Stat label="Completed" value={String(stats.completed)} />
        <Stat
          label="Completed cost"
          value={`SLE ${stats.totalCost.toString()}`}
          hint={`${stats.cancelled} cancelled`}
        />
      </div>

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

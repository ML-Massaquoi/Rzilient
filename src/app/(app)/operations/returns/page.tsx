import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLineIcon, SearchIcon, TriangleAlertIcon, UsersIcon } from "lucide-react";
import { requireRole } from "@/server/auth";
import {
  getActiveAssignment,
  listActiveAssignments,
} from "@/server/queries/custody";
import { listWarehouseOptions } from "@/server/queries/warehouses";
import { DEFAULT_WAREHOUSE_CODE } from "@/lib/warehouses";
import { AssignmentList } from "@/components/operations/assignment-list";
import { ReturnPanel } from "@/components/operations/return-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Returns",
};

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; assignment?: string }>;
}) {
  await requireRole("ADMIN", "IT_STAFF");
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const [{ items, overdueCount, activeCount }, selected, warehouses] =
    await Promise.all([
      listActiveAssignments({ q }),
      params.assignment ? getActiveAssignment(params.assignment) : null,
      listWarehouseOptions(),
    ]);
  const defaultWarehouseId =
    warehouses.find((row) => row.code === DEFAULT_WAREHOUSE_CODE)?.id ??
    warehouses[0]?.id;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PageHeader
        icon={ArrowDownToLineIcon}
        iconClassName="bg-amber-500/15 text-amber-600 dark:text-amber-400"
        title="Returns"
        subtitle="Record asset returns fast — condition, missing accessories and damage notes in one step."
        chips={[
          { label: "Active Assignments", value: activeCount, icon: UsersIcon },
          ...(overdueCount > 0
            ? [
                {
                  label: "Overdue",
                  value: overdueCount,
                  icon: TriangleAlertIcon,
                },
              ]
            : []),
        ]}
        actions={
          <Button variant="outline" render={<Link href="/operations/check-out" />}>
            Check out an asset
          </Button>
        }
      />

      <form className="flex max-w-md gap-2" action="/operations/returns">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search tag, asset or employee…"
            className="pl-9"
            aria-label="Search active assignments"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {selected ? (
        <ReturnPanel
          assignment={selected}
          warehouses={warehouses}
          defaultLocationId={defaultWarehouseId}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          Pick a row below to record its return.
        </p>
      )}

      <AssignmentList items={items} mode="return" selectedId={selected?.id} />
    </div>
  );
}

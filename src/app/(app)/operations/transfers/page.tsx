import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightLeftIcon, SearchIcon, UsersIcon } from "lucide-react";
import { requireRole } from "@/server/auth";
import {
  getActiveAssignment,
  listActiveAssignments,
} from "@/server/queries/custody";
import { AssignmentList } from "@/components/operations/assignment-list";
import { TransferPanel } from "@/components/operations/transfer-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Transfers",
};

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; assignment?: string }>;
}) {
  await requireRole("ADMIN", "IT_STAFF");
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const [{ items, activeCount }, selected] = await Promise.all([
    listActiveAssignments({ q }),
    params.assignment ? getActiveAssignment(params.assignment) : null,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PageHeader
        icon={ArrowRightLeftIcon}
        iconClassName="bg-violet-500/15 text-violet-600 dark:text-violet-400"
        title="Transfers"
        subtitle="Move custody between employees — history is never overwritten; the previous assignment stays permanently on record."
        chips={[{ label: "Active Assignments", value: activeCount, icon: UsersIcon }]}
        actions={
          <Button variant="outline" render={<Link href="/operations/check-out" />}>
            Check out an asset
          </Button>
        }
      />

      <form className="flex max-w-md gap-2" action="/operations/transfers">
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
        <TransferPanel assignment={selected} />
      ) : (
        <p className="text-muted-foreground text-sm">
          Pick a row below to transfer it to another employee.
        </p>
      )}

      <AssignmentList items={items} mode="transfer" selectedId={selected?.id} />
    </div>
  );
}

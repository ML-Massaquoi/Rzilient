import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { requireRole } from "@/server/auth";
import {
  getActiveAssignment,
  listActiveAssignments,
} from "@/server/queries/custody";
import { AssignmentList } from "@/components/operations/assignment-list";
import { TransferPanel } from "@/components/operations/transfer-panel";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Transfers
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Move custody between employees — history is never overwritten; the
            previous assignment stays permanently on record.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{activeCount} active</Badge>
          <Button variant="outline" render={<Link href="/operations/check-out" />}>
            Check out an asset
          </Button>
        </div>
      </div>

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

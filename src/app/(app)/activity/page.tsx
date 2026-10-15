import type { Metadata } from "next";
import { ActivityIcon, CircleDotIcon, ScrollTextIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import {
  getActivityFilterOptions,
  listAuditLogs,
} from "@/server/queries/activity";
import { ActivityFilters } from "@/components/activity/activity-filters";
import { ListPagination } from "@/components/assets/list-pagination";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/datetime";

export const metadata: Metadata = {
  title: "Activity",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function actionLabel(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const ACTION_STYLES: Record<string, string> = {
  ASSET_CREATED: "bg-status-available/15 text-status-available",
  ASSET_CHECKED_OUT: "bg-status-checked-out/15 text-status-checked-out",
  ASSET_RETURNED: "bg-status-available/15 text-status-available",
  ASSET_TRANSFERRED: "bg-status-maintenance/15 text-status-maintenance",
  MAINTENANCE_CREATED: "bg-status-maintenance/15 text-status-maintenance",
  MAINTENANCE_STATUS_CHANGED:
    "bg-status-maintenance/15 text-status-maintenance",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireUser();
  const sp = await searchParams;

  const q = first(sp.q);
  const action = first(sp.action);
  const userId = first(sp.user);
  const from = first(sp.from);
  const to = first(sp.to);
  const pageParam = Number(first(sp.page) ?? "1");

  const [result, options] = await Promise.all([
    listAuditLogs({
      q,
      action,
      userId,
      from,
      to,
      page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    }),
    getActivityFilterOptions(),
  ]);

  const hasFilters = Boolean(q || action || userId || from || to);

  const activeParams = new URLSearchParams();
  if (q) activeParams.set("q", q);
  if (action) activeParams.set("action", action);
  if (userId) activeParams.set("user", userId);
  if (from) activeParams.set("from", from);
  if (to) activeParams.set("to", to);
  const search = activeParams.toString();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <PageHeader
        icon={ScrollTextIcon}
        iconClassName="bg-rose-500/15 text-rose-600 dark:text-rose-400"
        title="Activity"
        subtitle="Application audit trail — who did what, when, and to which record. Audit entries are never editable."
        chips={[
          { label: "Entries", value: result.total, icon: ActivityIcon },
          {
            label: "Action Types",
            value: options.actions.length,
            icon: CircleDotIcon,
          },
        ]}
      />

      <ActivityFilters actions={options.actions} users={options.users} />

      {result.items.length > 0 ? (
        <div className="flex flex-col gap-4">
          <ol className="border-border relative space-y-4 border-l pl-5 ml-2">
            {result.items.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="bg-primary absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-background" />
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span
                    className="text-muted-foreground text-xs tabular-nums"
                    title={formatDateTime(entry.createdAt)}
                  >
                    {formatDateTime(entry.createdAt)}
                  </span>
                  <span className="text-sm font-semibold">
                    {entry.user?.name ?? "System"}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      ACTION_STYLES[entry.action] ??
                      "bg-muted text-muted-foreground"
                    }
                  >
                    {actionLabel(entry.action)}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm">{entry.summary}</p>
                <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                  <CircleDotIcon className="size-3" />
                  {entry.entityType}
                  {entry.entityId ? (
                    <span className="font-mono break-all">
                      {entry.entityId}
                    </span>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>

          <ListPagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            search={search}
            basePath="/activity"
            noun="entries"
          />
        </div>
      ) : hasFilters ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity matches these filters"
          description="Adjust the search or filters to widen the results."
        />
      ) : (
        <EmptyState
          icon={ActivityIcon}
          title="No activity recorded yet"
          description="Check-outs, returns, edits, imports and maintenance work will be listed here as they happen."
        />
      )}
    </div>
  );
}

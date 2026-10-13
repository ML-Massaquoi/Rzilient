import { ActivityIcon, ArrowRightIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { describeTransaction, type ActivityTransaction } from "@/lib/labels";
import { formatRelative, formatDateTime } from "@/lib/datetime";

export type ActivityEntry = ActivityTransaction & {
  id: string;
  createdAt: Date;
  performedBy: { name: string } | null;
};

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Recent activity
        </CardTitle>
        <CardDescription>Latest changes across the system</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title="No activity yet"
            description="Check-outs, returns, registrations and edits will be recorded here as they happen."
          />
        ) : (
          <ol className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <span className="bg-muted text-muted-foreground mt-0.5 grid size-6 shrink-0 place-items-center rounded-full">
                  <ArrowRightIcon className="size-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    {describeTransaction(entry)}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {entry.performedBy ? `${entry.performedBy.name} · ` : ""}
                    <time
                      dateTime={entry.createdAt.toISOString()}
                      title={formatDateTime(entry.createdAt)}
                    >
                      {formatRelative(entry.createdAt)}
                    </time>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import { ArrowRightIcon, BoxesIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function DistributionList({
  distribution,
}: {
  distribution: {
    id: string;
    name: string;
    slug: string | null;
    count: number;
  }[];
}) {
  const max = Math.max(1, ...distribution.map((entry) => entry.count));
  const total = distribution.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Assets by category
        </CardTitle>
        <CardDescription>
          {distribution.length > 0
            ? `${total} registered assets across ${distribution.length} ${distribution.length === 1 ? "category" : "categories"} — click a category to see its assets`
            : "No registered assets yet"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {distribution.length === 0 ? (
          <EmptyState
            icon={BoxesIcon}
            title="No assets registered"
            description="Once assets are registered or imported, their distribution across categories will appear here."
          />
        ) : (
          <ul className="space-y-1.5">
            {distribution.map((entry) => {
              const row = (
                <>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
                      <span className="truncate">{entry.name}</span>
                      <ArrowRightIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {entry.count}
                    </span>
                  </div>
                  <div
                    className="bg-muted h-1.5 overflow-hidden rounded-full"
                    role="presentation"
                  >
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{
                        width: `${Math.max(4, Math.round((entry.count / max) * 100))}%`,
                      }}
                    />
                  </div>
                </>
              );

              return (
                <li key={entry.id}>
                  {entry.slug ? (
                    <Link
                      href={`/assets?category=${encodeURIComponent(entry.slug)}`}
                      className="group hover:bg-accent/60 -mx-2 block rounded-lg px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={`See all ${entry.name} assets`}
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="-mx-2 block px-2 py-1.5">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

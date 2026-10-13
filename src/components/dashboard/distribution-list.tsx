import { BoxesIcon } from "lucide-react";
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
  distribution: { id: string; name: string; count: number }[];
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
            ? `${total} registered assets across ${distribution.length} ${distribution.length === 1 ? "category" : "categories"}`
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
          <ul className="space-y-3.5">
            {distribution.map((entry) => (
              <li key={entry.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">
                    {entry.name}
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
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

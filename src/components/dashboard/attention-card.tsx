import { cn } from "cn";
import {
  CircleCheckIcon,
  ClockAlertIcon,
  PackageIcon,
  SearchIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AttentionCard({
  label,
  count,
  icon: Icon,
  tone,
}: {
  label: string;
  count: number;
  icon: LucideIcon;
  tone: "warning" | "danger";
}) {
  const clear = count === 0;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3.5",
        clear && "border-border/60 bg-muted/30"
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md",
          clear
            ? "bg-status-available/15 text-status-available"
            : tone === "danger"
              ? "bg-status-damaged/15 text-status-damaged"
              : "bg-status-maintenance/15 text-status-maintenance"
        )}
      >
        {clear ? <CircleCheckIcon className="size-4" /> : <Icon className="size-4" />}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-lg leading-tight font-semibold tabular-nums",
            clear && "text-muted-foreground"
          )}
        >
          {clear ? "0" : count}
        </p>
        <p className="text-muted-foreground truncate text-xs">{label}</p>
      </div>
    </div>
  );
}

export function AttentionSection({
  overdue,
  damaged,
  missing,
  lowStock,
}: {
  overdue: number;
  damaged: number;
  missing: number;
  lowStock: number;
}) {
  const total = overdue + damaged + missing + lowStock;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Attention required
        </CardTitle>
        {total === 0 ? (
          <p className="text-muted-foreground text-xs">
            No overdue loans, damaged or missing assets, or low-stock items.
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <AttentionCard
          label="Overdue loans"
          count={overdue}
          icon={ClockAlertIcon}
          tone="warning"
        />
        <AttentionCard
          label="Damaged assets"
          count={damaged}
          icon={WrenchIcon}
          tone="danger"
        />
        <AttentionCard
          label="Missing assets"
          count={missing}
          icon={SearchIcon}
          tone="danger"
        />
        <AttentionCard
          label="Low-stock items"
          count={lowStock}
          icon={PackageIcon}
          tone="warning"
        />
      </CardContent>
    </Card>
  );
}

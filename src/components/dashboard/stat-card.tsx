import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const TONES = {
  default: "bg-primary/10 text-primary",
  success: "bg-status-available/15 text-status-available",
  info: "bg-status-checked-out/15 text-status-checked-out",
  warning: "bg-status-maintenance/15 text-status-maintenance",
  danger: "bg-status-damaged/15 text-status-damaged",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-start justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {hint}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            TONES[tone]
          )}
        >
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

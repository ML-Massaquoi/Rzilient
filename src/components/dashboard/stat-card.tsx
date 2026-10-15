import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

const TONES = {
  default: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  info: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
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
    <div className="bg-card border-border rounded-xl border p-4">
      <div className="flex items-center gap-3.5">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            TONES[tone]
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-2xl leading-none font-bold tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="text-muted-foreground mt-1.5 truncate text-xs">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

/** Pastel tile colors used across page headers, stat cards and row avatars. */
export const TILE_PALETTE = [
  "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
] as const;

/** Deterministic palette pick so the same entity always gets the same color. */
export function tileClassForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return TILE_PALETTE[Math.abs(hash) % TILE_PALETTE.length];
}

export type PageChip = {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
};

export function PageHeader({
  icon: Icon,
  iconClassName = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  title,
  subtitle,
  chips,
  actions,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  chips?: PageChip[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            iconClassName
          )}
        >
          <Icon className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {chips?.length ? (
        <div className="bg-primary/5 border-primary/10 hidden items-center gap-1 rounded-xl border p-1.5 xl:flex">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm"
            >
              <chip.icon className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold tabular-nums">{chip.value}</span>
              <span className="text-muted-foreground">{chip.label}</span>
            </span>
          ))}
        </div>
      ) : null}
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  tileClassName = "bg-primary/10 text-primary",
  label,
  value,
  caption,
}: {
  icon: LucideIcon;
  tileClassName?: string;
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
}) {
  return (
    <div className="bg-card border-border rounded-xl border p-4">
      <div className="flex items-center gap-3.5">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            tileClassName
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-2xl leading-none font-bold tabular-nums">
            {value}
          </p>
          {caption ? (
            <p className="text-muted-foreground mt-1.5 truncate text-xs">
              {caption}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StatGrid({
  cols = 4,
  children,
  className,
}: {
  cols?: 3 | 4;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Rounded content shell used for lists/tables (matches the departments page). */
export function PanelCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card border-border rounded-xl border", className)}>
      {children}
    </div>
  );
}

import { cn } from "cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-lg text-lg font-bold tracking-tight",
        className
      )}
      aria-hidden
    >
      A
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-base font-semibold tracking-tight">Avci</span>
    </span>
  );
}

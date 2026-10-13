import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { AssetStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/labels";

const STATUS_CLASSES: Record<AssetStatus, string> = {
  AVAILABLE: "bg-status-available/15 text-status-available border-transparent",
  CHECKED_OUT:
    "bg-status-checked-out/15 text-status-checked-out border-transparent",
  MAINTENANCE:
    "bg-status-maintenance/15 text-status-maintenance border-transparent",
  DAMAGED: "bg-status-damaged/15 text-status-damaged border-transparent",
  MISSING: "bg-status-missing/15 text-status-missing border-transparent",
  RETIRED: "bg-status-retired/15 text-status-retired border-transparent",
  DISPOSED: "bg-status-disposed/15 text-status-disposed border-transparent",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AssetStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium whitespace-nowrap",
        STATUS_CLASSES[status],
        className
      )}
    >
      <span className="bg-current size-1.5 rounded-full" aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

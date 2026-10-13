import { Badge } from "@/components/ui/badge";
import type { MaintenanceStatus } from "@/generated/prisma/enums";
import { MAINTENANCE_STATUS_LABELS } from "@/lib/labels";

const STATUS_STYLES: Record<MaintenanceStatus, string> = {
  OPEN: "bg-status-maintenance/15 text-status-maintenance",
  IN_PROGRESS: "bg-status-checked-out/15 text-status-checked-out",
  COMPLETED: "bg-status-available/15 text-status-available",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function MaintenanceStatusBadge({
  status,
}: {
  status: MaintenanceStatus;
}) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {MAINTENANCE_STATUS_LABELS[status]}
    </Badge>
  );
}

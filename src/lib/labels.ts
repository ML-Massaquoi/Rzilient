import type {
  AssetCondition,
  AssetStatus,
  AssetTransactionAction,
  EmploymentStatus,
  MaintenanceStatus,
  MaintenanceType,
  StockTransactionType,
} from "@/generated/prisma/enums";

export const STATUS_LABELS: Record<AssetStatus, string> = {
  AVAILABLE: "Available",
  CHECKED_OUT: "Checked out",
  MAINTENANCE: "In maintenance",
  DAMAGED: "Damaged",
  MISSING: "Missing",
  RETIRED: "Retired",
  DISPOSED: "Disposed",
};

export const CONDITION_LABELS: Record<AssetCondition, string> = {
  NEW: "New",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  DAMAGED: "Damaged",
  MALFUNCTIONING: "Malfunctioning",
};

export const ACTION_LABELS: Record<AssetTransactionAction, string> = {
  CREATED: "Registered",
  EDITED: "Edited",
  IMPORTED: "Imported",
  CHECKED_OUT: "Checked out",
  RETURNED: "Returned",
  TRANSFERRED: "Transferred",
  MAINTENANCE_STARTED: "Maintenance started",
  MAINTENANCE_COMPLETED: "Maintenance completed",
  DAMAGED: "Marked damaged",
  MARKED_MISSING: "Marked missing",
  FOUND: "Found",
  RETIRED: "Retired",
  DISPOSED: "Disposed",
  ARCHIVED: "Archived",
  RESTORED: "Restored",
  LOCATION_CHANGED: "Location changed",
  CONDITION_CHANGED: "Condition changed",
  STATUS_CHANGED: "Status changed",
  COMPONENT_ADDED: "Component added",
  COMPONENT_REMOVED: "Component removed",
};

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVE: "Preventive",
  CORRECTIVE: "Corrective",
  INSPECTION: "Inspection",
  CALIBRATION: "Calibration",
  WARRANTY: "Warranty",
  OTHER: "Other",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const STOCK_TX_LABELS: Record<StockTransactionType, string> = {
  RECEIVED: "Received",
  ISSUED: "Issued",
  ADJUSTED: "Adjusted",
  DAMAGED: "Damaged",
  LOST: "Lost",
  RETURNED: "Returned",
};

export type ActivityTransaction = {
  action: AssetTransactionAction;
  asset: { assetTag: string; name: string };
  employee?: { fullName: string } | null;
  fromEmployee?: { fullName: string } | null;
  toEmployee?: { fullName: string } | null;
  notes?: string | null;
};

/** Human-readable sentence describing a transaction for feeds/tables. */
export function describeTransaction(tx: ActivityTransaction): string {
  const asset = `${tx.asset.assetTag} · ${tx.asset.name}`;

  switch (tx.action) {
    case "CHECKED_OUT":
      return tx.employee
        ? `${asset} checked out to ${tx.employee.fullName}`
        : `${asset} checked out`;
    case "RETURNED":
      return tx.employee
        ? `${asset} returned from ${tx.employee.fullName}`
        : `${asset} returned`;
    case "TRANSFERRED":
      if (tx.fromEmployee && tx.toEmployee) {
        return `${asset} transferred from ${tx.fromEmployee.fullName} to ${tx.toEmployee.fullName}`;
      }
      if (tx.toEmployee) {
        return `${asset} transferred to ${tx.toEmployee.fullName}`;
      }
      return `${asset} transferred`;
    case "CREATED":
    case "IMPORTED":
      return `${asset} ${ACTION_LABELS[tx.action].toLowerCase()}`;
    case "LOCATION_CHANGED":
    case "CONDITION_CHANGED":
    case "STATUS_CHANGED":
      return tx.notes
        ? `${asset} — ${tx.notes}`
        : `${ACTION_LABELS[tx.action]} · ${asset}`;
    default:
      return `${ACTION_LABELS[tx.action]} · ${asset}`;
  }
}

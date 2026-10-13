import { db } from "@/lib/db";
import {
  AssetStatus,
  AssetTransactionAction,
  MaintenanceStatus,
  MaintenanceType,
} from "@/generated/prisma/enums";
import { getReportSummary } from "@/server/queries/report-charts";

export const REPORT_TYPES = [
  "overview",
  "asset-inventory",
  "custody",
  "maintenance",
  "missing-damaged",
  "stock",
  "asset-history",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export function isReportType(value: string | null | undefined): value is ReportType {
  return typeof value === "string" && (REPORT_TYPES as readonly string[]).includes(value);
}

export const REPORT_META: Record<
  ReportType,
  { title: string; description: string }
> = {
  overview: {
    title: "Executive Overview",
    description: "KPIs and charts across assets, custody, maintenance and stock.",
  },
  "asset-inventory": {
    title: "Asset Inventory Report",
    description: "Every registered asset with tag, serial, status, condition and custodian.",
  },
  custody: {
    title: "Current Custody Report",
    description: "Every employee and the assets currently assigned to them.",
  },
  maintenance: {
    title: "Maintenance Report",
    description: "Maintenance activity, technicians, downtime and costs.",
  },
  "missing-damaged": {
    title: "Missing / Damaged Report",
    description: "Assets requiring attention — missing, damaged or malfunctioning.",
  },
  stock: {
    title: "Stock Report",
    description: "Quantities on hand, minimums and low-stock items.",
  },
  "asset-history": {
    title: "Asset History Report",
    description: "Full transaction history export — check-outs, returns, edits and more.",
  },
};

export type ReportFilters = {
  q?: string;
  status?: string;
  category?: string;
  department?: string;
  type?: string;
  action?: string;
  from?: string;
  to?: string;
  low?: boolean;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses report filters from a URL search params object (shared by page + export route). */
export function parseReportFilters(params: URLSearchParams): ReportFilters {
  const date = (key: string) => {
    const value = params.get(key);
    return value && DATE_RE.test(value) ? value : undefined;
  };
  return {
    q: params.get("q")?.trim() || undefined,
    status: params.get("status") || undefined,
    category: params.get("category") || undefined,
    department: params.get("department") || undefined,
    type: params.get("type__") || undefined,
    action: params.get("action") || undefined,
    from: date("from"),
    to: date("to"),
    low: params.get("low") === "1",
  };
}

export function reportHref(type: ReportType, filters: ReportFilters): string {
  const params = new URLSearchParams({ type });
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.department) params.set("department", filters.department);
  if (filters.type) params.set("type__", filters.type);
  if (filters.action) params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.low) params.set("low", "1");
  return params.toString();
}

export function describeReportFilters(filters: ReportFilters): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`Search: ${filters.q}`);
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.category) parts.push(`Category: ${filters.category}`);
  if (filters.department) parts.push(`Department: ${filters.department}`);
  if (filters.type) parts.push(`Type: ${filters.type}`);
  if (filters.action) parts.push(`Action: ${filters.action}`);
  if (filters.from) parts.push(`From: ${filters.from}`);
  if (filters.to) parts.push(`To: ${filters.to}`);
  if (filters.low) parts.push("Low stock only");
  return parts.length > 0 ? parts.join(" · ") : "No filters applied";
}

function inEnum<T extends Record<string, string>>(
  values: T,
  value: string | undefined
): value is T[keyof T] {
  return typeof value === "string" && value in values;
}

function dateRange(
  from?: string,
  to?: string
): { gte?: Date; lt?: Date } {
  const range: { gte?: Date; lt?: Date } = {};
  if (from) {
    const start = new Date(from);
    if (!Number.isNaN(start.getTime())) range.gte = start;
  }
  if (to) {
    const end = new Date(to);
    if (!Number.isNaN(end.getTime())) {
      end.setDate(end.getDate() + 1);
      range.lt = end;
    }
  }
  return range;
}

export type ReportResult = {
  columns: string[];
  rows: string[][];
  total: number;
};

const REPORT_LIMIT = 5000;

function fmt(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

export async function runReport(
  type: ReportType,
  filters: ReportFilters,
  limit = REPORT_LIMIT
): Promise<ReportResult> {
  const q = filters.q;

  switch (type) {
    case "overview": {
      const summary = await getReportSummary("overview", filters);
      return {
        columns: ["Metric", "Value", "Detail"],
        rows: summary.kpis.map((kpi) => [kpi.label, kpi.value, kpi.hint ?? ""]),
        total: summary.kpis.length,
      };
    }

    case "asset-inventory": {
      const where: Record<string, unknown> = { archivedAt: null };
      if (inEnum(AssetStatus, filters.status)) where.status = filters.status;
      if (filters.category) {
        where.category = { slug: filters.category };
      }
      if (q) {
        where.OR = [
          { assetTag: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { serialNumber: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { model: { contains: q, mode: "insensitive" } },
        ];
      }
      const total = await db.asset.count({ where });
      const assets = await db.asset.findMany({
        where,
        orderBy: [{ assetTag: "asc" }],
        take: limit,
        select: {
          assetTag: true,
          name: true,
          serialNumber: true,
          category: { select: { name: true } },
          status: true,
          condition: true,
          location: { select: { name: true } },
          activeAssignment: {
            select: {
              employee: {
                select: {
                  fullName: true,
                  department: { select: { name: true } },
                },
              },
            },
          },
        },
      });
      return {
        columns: [
          "Asset Tag",
          "Device",
          "Serial",
          "Category",
          "Status",
          "Condition",
          "Current Custodian",
          "Department",
          "Location",
        ],
        rows: assets.map((asset) => [
          asset.assetTag,
          asset.name,
          fmt(asset.serialNumber),
          asset.category.name,
          asset.status,
          asset.condition,
          fmt(asset.activeAssignment?.employee.fullName),
          fmt(asset.activeAssignment?.employee.department.name),
          fmt(asset.location?.name),
        ]),
        total,
      };
    }

    case "custody": {
      const where: Record<string, unknown> = { status: "ACTIVE" };
      if (q) {
        where.OR = [
          { employee: { fullName: { contains: q, mode: "insensitive" } } },
          { employee: { fiaNumber: { contains: q, mode: "insensitive" } } },
          { asset: { assetTag: { contains: q, mode: "insensitive" } } },
          { asset: { name: { contains: q, mode: "insensitive" } } },
        ];
      }
      if (filters.department) {
        where.employee = {
          ...(where.employee as object),
          department: { name: { equals: filters.department, mode: "insensitive" } },
        };
      }
      const total = await db.assetAssignment.count({ where });
      const assignments = await db.assetAssignment.findMany({
        where,
        orderBy: [{ assignedAt: "desc" }],
        take: limit,
        select: {
          assignedAt: true,
          expectedReturnAt: true,
          conditionAtCheckout: true,
          employee: {
            select: {
              fullName: true,
              fiaNumber: true,
              position: true,
              department: { select: { name: true } },
            },
          },
          asset: { select: { assetTag: true, name: true, serialNumber: true } },
        },
      });
      return {
        columns: [
          "Employee",
          "FIA Number",
          "Department",
          "Position",
          "Asset Tag",
          "Device",
          "Serial",
          "Condition at Checkout",
          "Assigned At",
          "Expected Return",
        ],
        rows: assignments.map((row) => [
          row.employee.fullName,
          fmt(row.employee.fiaNumber),
          row.employee.department.name,
          fmt(row.employee.position),
          row.asset.assetTag,
          row.asset.name,
          fmt(row.asset.serialNumber),
          row.conditionAtCheckout,
          fmt(row.assignedAt),
          fmt(row.expectedReturnAt),
        ]),
        total,
      };
    }

    case "maintenance": {
      const where: Record<string, unknown> = {};
      if (inEnum(MaintenanceStatus, filters.status)) where.status = filters.status;
      if (inEnum(MaintenanceType, filters.type)) where.type = filters.type;
      if (q) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { technician: { contains: q, mode: "insensitive" } },
          { asset: { assetTag: { contains: q, mode: "insensitive" } } },
          { asset: { name: { contains: q, mode: "insensitive" } } },
        ];
      }
      const total = await db.maintenanceRecord.count({ where });
      const records = await db.maintenanceRecord.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        take: limit,
        select: {
          type: true,
          title: true,
          status: true,
          technician: true,
          cost: true,
          downtimeHours: true,
          createdAt: true,
          completedAt: true,
          asset: { select: { assetTag: true, name: true } },
        },
      });
      return {
        columns: [
          "Asset Tag",
          "Asset",
          "Type",
          "Title",
          "Status",
          "Technician",
          "Cost",
          "Downtime (h)",
          "Reported",
          "Completed",
        ],
        rows: records.map((record) => [
          record.asset.assetTag,
          record.asset.name,
          record.type,
          record.title,
          record.status,
          fmt(record.technician),
          record.cost != null ? record.cost.toString() : "",
          record.downtimeHours != null ? String(record.downtimeHours) : "",
          fmt(record.createdAt),
          fmt(record.completedAt),
        ]),
        total,
      };
    }

    case "missing-damaged": {
      const attentionStatuses = ["MISSING", "DAMAGED"];
      const attentionConditions = ["DAMAGED", "MALFUNCTIONING"];
      const where: Record<string, unknown> = {
        archivedAt: null,
        OR: [
          { status: { in: attentionStatuses } },
          { condition: { in: attentionConditions } },
        ],
      };
      if (q) {
        where.AND = [
          {
            OR: [
              { assetTag: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { serialNumber: { contains: q, mode: "insensitive" } },
            ],
          },
        ];
      }
      const total = await db.asset.count({ where });
      const assets = await db.asset.findMany({
        where,
        orderBy: [{ status: "asc" }, { assetTag: "asc" }],
        take: limit,
        select: {
          assetTag: true,
          name: true,
          serialNumber: true,
          status: true,
          condition: true,
          notes: true,
          activeAssignment: {
            select: { employee: { select: { fullName: true } } },
          },
        },
      });
      return {
        columns: ["Asset Tag", "Device", "Serial", "Status", "Condition", "Custodian", "Notes"],
        rows: assets.map((asset) => [
          asset.assetTag,
          asset.name,
          fmt(asset.serialNumber),
          asset.status,
          asset.condition,
          fmt(asset.activeAssignment?.employee.fullName),
          fmt(asset.notes),
        ]),
        total,
      };
    }

    case "stock": {
      const where: Record<string, unknown> = {};
      if (q) {
        where.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ];
      }
      const all = await db.inventoryItem.findMany({
        where,
        orderBy: [{ name: "asc" }],
        select: {
          sku: true,
          name: true,
          category: true,
          quantity: true,
          unit: true,
          minimumStock: true,
          reorderLevel: true,
          location: { select: { name: true } },
        },
      });
      const low = (item: { quantity: number; minimumStock: number }) =>
        item.minimumStock > 0 && item.quantity < item.minimumStock;
      const filtered = filters.low ? all.filter(low) : all;
      return {
        columns: [
          "SKU",
          "Item",
          "Category",
          "On Hand",
          "Unit",
          "Minimum Stock",
          "Reorder Level",
          "Location",
          "Low Stock",
        ],
        rows: filtered.slice(0, limit).map((item) => [
          item.sku,
          item.name,
          fmt(item.category),
          String(item.quantity),
          item.unit,
          String(item.minimumStock),
          fmt(item.reorderLevel),
          fmt(item.location?.name),
          low(item) ? "YES" : "",
        ]),
        total: filtered.length,
      };
    }

    case "asset-history": {
      const where: Record<string, unknown> = {};
      if (inEnum(AssetTransactionAction, filters.action)) {
        where.action = filters.action;
      }
      const range = dateRange(filters.from, filters.to);
      if (range.gte || range.lt) where.createdAt = range;
      if (q) {
        where.OR = [
          { asset: { assetTag: { contains: q, mode: "insensitive" } } },
          { asset: { name: { contains: q, mode: "insensitive" } } },
          { notes: { contains: q, mode: "insensitive" } },
        ];
      }
      const total = await db.assetTransaction.count({ where });
      const transactions = await db.assetTransaction.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        take: limit,
        select: {
          action: true,
          createdAt: true,
          fromStatus: true,
          toStatus: true,
          notes: true,
          asset: { select: { assetTag: true, name: true } },
          performedBy: { select: { name: true } },
          fromEmployee: { select: { fullName: true } },
          toEmployee: { select: { fullName: true } },
        },
      });
      return {
        columns: [
          "When",
          "Asset Tag",
          "Asset",
          "Action",
          "Performed By",
          "From Status",
          "To Status",
          "From Employee",
          "To Employee",
          "Notes",
        ],
        rows: transactions.map((tx) => [
          tx.createdAt.toISOString(),
          tx.asset.assetTag,
          tx.asset.name,
          tx.action,
          tx.performedBy.name,
          fmt(tx.fromStatus),
          fmt(tx.toStatus),
          fmt(tx.fromEmployee?.fullName),
          fmt(tx.toEmployee?.fullName),
          fmt(tx.notes),
        ]),
        total,
      };
    }
  }
}

export function toCsv(columns: string[], rows: string[][]): string {
  const escape = (value: string) =>
    /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return (
    "\uFEFF" +
    [columns, ...rows]
      .map((row) => row.map(escape).join(","))
      .join("\r\n")
  );
}

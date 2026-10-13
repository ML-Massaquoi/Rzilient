import { db } from "@/lib/db";
import {
  ACTION_LABELS,
  CONDITION_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import { AssetStatus, AssetTransactionAction } from "@/generated/prisma/enums";
import type { ReportFilters, ReportType } from "@/server/queries/reports";

/** Operational timezone (README §63). */
const TZ = "Africa/Freetown";

const COLORS = {
  available: "#10b981",
  checkedOut: "#6366f1",
  maintenance: "#f59e0b",
  damaged: "#f97316",
  missing: "#ef4444",
  retired: "#94a3b8",
  disposed: "#64748b",
  primary: "#6366f1",
  accent: "#0ea5e9",
  inStock: "#10b981",
  low: "#f59e0b",
  out: "#ef4444",
  series: [
    "#6366f1",
    "#10b981",
    "#f59e0b",
    "#0ea5e9",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#8b5cf6",
  ],
};

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: COLORS.available,
  CHECKED_OUT: COLORS.checkedOut,
  MAINTENANCE: COLORS.maintenance,
  DAMAGED: COLORS.damaged,
  MISSING: COLORS.missing,
  RETIRED: COLORS.retired,
  DISPOSED: COLORS.disposed,
};

const CONDITION_COLOR: Record<string, string> = {
  NEW: "#10b981",
  EXCELLENT: "#14b8a6",
  GOOD: "#0ea5e9",
  FAIR: "#f59e0b",
  DAMAGED: "#f97316",
  MALFUNCTIONING: "#ef4444",
};

export type KpiCard = {
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "warning" | "danger" | "info";
};

export type ChartBlock =
  | {
      kind: "donut";
      id: string;
      title: string;
      subtitle?: string;
      slices: { label: string; value: number; color: string }[];
    }
  | {
      kind: "bars";
      id: string;
      title: string;
      subtitle?: string;
      unit?: string;
      data: { label: string; value: number; hint?: string; color?: string }[];
    }
  | {
      kind: "columns";
      id: string;
      title: string;
      subtitle?: string;
      unit?: string;
      series: { name: string; color: string }[];
      points: { label: string; values: number[] }[];
    }
  | {
      kind: "trend";
      id: string;
      title: string;
      subtitle?: string;
      unit?: string;
      series: { name: string; color: string }[];
      points: { label: string; values: number[] }[];
    };

export type ReportSummary = {
  kpis: KpiCard[];
  charts: ChartBlock[];
};

const num = (value: number) => value.toLocaleString("en-US");
const money = (value: number) =>
  `SLE ${Math.round(value).toLocaleString("en-US")}`;
const share = (part: number, total: number) =>
  total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`;

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabelFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
});
const monthFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
});
const monthLabelFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  month: "short",
  year: "2-digit",
});

function startOfUtcDay(offsetDays = 0): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offsetDays)
  );
}

function eachDay(gte: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(gte);
  const limit = new Date();
  while (cursor <= limit) {
    days.push(dayFmt.format(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function eachMonth(gte: Date): string[] {
  const months: string[] = [];
  const cursor = new Date(gte);
  const limit = new Date();
  while (cursor <= limit) {
    months.push(monthFmt.format(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return monthLabelFmt.format(date);
}

type CategoryWhere = Record<string, unknown>;

function inEnum<T extends Record<string, string>>(
  values: T,
  value: string | undefined
): value is T[keyof T] {
  return typeof value === "string" && value in values;
}

/* ------------------------------------------------------------------ */
/* Shared breakdowns                                                   */
/* ------------------------------------------------------------------ */

async function statusDonut(where: CategoryWhere, title: string, subtitle?: string): Promise<ChartBlock> {
  const groups = await db.asset.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });
  const order = Object.keys(AssetStatus) as (keyof typeof AssetStatus)[];
  const slices = order
    .map((status) => {
      const found = groups.find((group) => group.status === status);
      return {
        label: STATUS_LABELS[status],
        value: found?._count._all ?? 0,
        color: STATUS_COLOR[status],
      };
    })
    .filter((slice) => slice.value > 0);
  return { kind: "donut", id: `status-${title}`, title, subtitle, slices };
}

async function categoryBars(where: CategoryWhere, title: string, subtitle?: string): Promise<ChartBlock> {
  const groups = await db.asset.groupBy({
    by: ["categoryId"],
    where,
    _count: { _all: true },
  });
  const categories = await db.assetCategory.findMany({
    select: { id: true, name: true },
  });
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const data = groups
    .map((group) => ({
      label: names.get(group.categoryId) ?? "Uncategorized",
      value: group._count._all,
      color: COLORS.primary,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  return { kind: "bars", id: `category-${title}`, title, subtitle, data };
}

async function custodyByDepartment(
  where: Record<string, unknown>,
  title: string
): Promise<ChartBlock> {
  const assignments = await db.assetAssignment.findMany({
    where,
    select: {
      employee: {
        select: { department: { select: { name: true } } },
      },
    },
  });
  const counts = new Map<string, number>();
  for (const assignment of assignments) {
    const name = assignment.employee.department.name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const data = [...counts.entries()]
    .map(([label, value]) => ({ label, value, color: COLORS.accent }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  return { kind: "bars", id: "custody-department", title, data };
}

async function checkoutTrend(gte: Date, title: string, subtitle?: string): Promise<ChartBlock> {
  const transactions = await db.assetTransaction.findMany({
    where: {
      createdAt: { gte },
      action: { in: ["CHECKED_OUT", "RETURNED"] },
    },
    select: { createdAt: true, action: true },
    orderBy: { createdAt: "asc" },
    take: 20000,
  });
  const days = eachDay(gte);
  const map = new Map<string, { checkouts: number; returns: number }>();
  for (const day of days) map.set(day, { checkouts: 0, returns: 0 });
  for (const tx of transactions) {
    const key = dayFmt.format(tx.createdAt);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (tx.action === "CHECKED_OUT") bucket.checkouts += 1;
    else bucket.returns += 1;
  }
  return {
    kind: "trend",
    id: "checkout-trend",
    title,
    subtitle,
    series: [
      { name: "Check-outs", color: COLORS.primary },
      { name: "Returns", color: COLORS.available },
    ],
    points: days.map((day) => {
      const bucket = map.get(day)!;
      const label = dayLabelFmt.format(new Date(`${day}T12:00:00Z`));
      return { label, values: [bucket.checkouts, bucket.returns] };
    }),
  };
}

async function maintenanceMonthly(
  gte: Date,
  title: string
): Promise<ChartBlock> {
  const records = await db.maintenanceRecord.findMany({
    where: { createdAt: { gte } },
    select: { createdAt: true, cost: true },
  });
  const months = eachMonth(gte);
  const map = new Map<string, number>(months.map((month) => [month, 0]));
  for (const record of records) {
    const key = monthFmt.format(record.createdAt);
    const current = map.get(key);
    if (current === undefined) continue;
    map.set(key, current + Number(record.cost ?? 0));
  }
  return {
    kind: "columns",
    id: "maintenance-cost",
    title,
    subtitle: "Maintenance spend per month",
    unit: "SLE",
    series: [{ name: "Cost", color: COLORS.maintenance }],
    points: months.map((month) => ({
      label: monthLabel(month),
      values: [map.get(month) ?? 0],
    })),
  };
}

async function lowStockItems(): Promise<
  { quantity: number; minimumStock: number }[]
> {
  const items = await db.inventoryItem.findMany({
    select: { quantity: true, minimumStock: true },
  });
  return items;
}

/* ------------------------------------------------------------------ */
/* Per-report summaries                                                */
/* ------------------------------------------------------------------ */

async function overviewSummary(): Promise<ReportSummary> {
  const now = new Date();
  const thirtyDaysAgo = startOfUtcDay(30);
  const twelveMonthsAgo = (() => {
    const date = new Date(now);
    date.setUTCMonth(date.getUTCMonth() - 12);
    return date;
  })();

  const [
    statusGroups,
    totalAssets,
    activeAssignments,
    overdue,
    attention,
    openMaintenance,
    inProgressMaintenance,
    recentRecords,
    stockItems,
    categoryChart,
    departmentChart,
    trendChart,
    maintenanceChart,
  ] = await Promise.all([
    db.asset.groupBy({
      by: ["status"],
      where: { archivedAt: null },
      _count: { _all: true },
    }),
    db.asset.count({ where: { archivedAt: null } }),
    db.assetAssignment.count({ where: { status: "ACTIVE" } }),
    db.assetAssignment.count({
      where: { status: "ACTIVE", expectedReturnAt: { lt: now } },
    }),
    db.asset.count({
      where: {
        archivedAt: null,
        OR: [
          { status: { in: ["MISSING", "DAMAGED"] } },
          { condition: { in: ["MALFUNCTIONING"] } },
        ],
      },
    }),
    db.maintenanceRecord.count({ where: { status: "OPEN" } }),
    db.maintenanceRecord.count({ where: { status: "IN_PROGRESS" } }),
    db.maintenanceRecord.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { cost: true },
    }),
    lowStockItems(),
    categoryBars({ archivedAt: null }, "Assets by category", "Top categories by fleet size"),
    custodyByDepartment({ status: "ACTIVE" }, "Custody by department"),
    checkoutTrend(thirtyDaysAgo, "Check-outs & returns", "Last 30 days · Africa/Freetown"),
    maintenanceMonthly(twelveMonthsAgo, "Maintenance spend"),
  ]);

  const statusTotal = statusGroups.reduce(
    (sum, group) => sum + group._count._all,
    0
  );
  const statusFor = (status: string) =>
    statusGroups.find((group) => group.status === status)?._count._all ?? 0;

  const spend = recentRecords.reduce(
    (sum, record) => sum + Number(record.cost ?? 0),
    0
  );
  const low = stockItems.filter(
    (item) => item.minimumStock > 0 && item.quantity < item.minimumStock
  );
  const out = stockItems.filter((item) => item.quantity === 0);

  const kpis: KpiCard[] = [
    {
      label: "Total assets",
      value: num(totalAssets),
      hint: "Registered, not archived",
    },
    {
      label: "Checked out",
      value: num(statusFor("CHECKED_OUT")),
      hint: `${share(statusFor("CHECKED_OUT"), totalAssets)} of the fleet`,
    },
    {
      label: "Available",
      value: num(statusFor("AVAILABLE")),
      hint: "Ready for assignment",
      tone: "success",
    },
    {
      label: "In maintenance",
      value: num(statusFor("MAINTENANCE")),
      hint: `${openMaintenance + inProgressMaintenance} open work order${openMaintenance + inProgressMaintenance === 1 ? "" : "s"}`,
      tone: "warning",
    },
    {
      label: "Needs attention",
      value: num(attention),
      hint: "Missing, damaged or faulty",
      tone: attention > 0 ? "danger" : "success",
    },
    {
      label: "Active custody",
      value: num(activeAssignments),
      hint: overdue > 0 ? `${overdue} overdue return${overdue === 1 ? "" : "s"}` : "No overdue returns",
      tone: overdue > 0 ? "warning" : undefined,
    },
    {
      label: "Low stock items",
      value: num(low.length),
      hint: `${out.length} out of stock`,
      tone: low.length > 0 ? "warning" : "success",
    },
    {
      label: "Maintenance spend (12m)",
      value: money(spend),
      hint: `${num(recentRecords.length)} work orders`,
    },
  ];

  const statusSlices = (Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[])
    .map((status) => ({
      label: STATUS_LABELS[status],
      value: statusFor(status),
      color: STATUS_COLOR[status],
    }))
    .filter((slice) => slice.value > 0);

  const healthSlices = [
    { label: "In stock", value: stockItems.length - low.length, color: COLORS.inStock },
    { label: "Low stock", value: low.length, color: COLORS.low },
    { label: "Out of stock", value: out.length, color: COLORS.out },
  ].filter((slice) => slice.value > 0);

  return {
    kpis,
    charts: [
      {
        kind: "donut",
        id: "overview-status",
        title: "Fleet by status",
        subtitle: `${num(statusTotal)} assets`,
        slices: statusSlices,
      },
      categoryChart,
      departmentChart,
      trendChart,
      maintenanceChart,
      {
        kind: "donut",
        id: "stock-health",
        title: "Stock health",
        subtitle: `${num(stockItems.length)} SKUs tracked`,
        slices: healthSlices,
      },
    ],
  };
}

async function assetInventorySummary(filters: ReportFilters): Promise<ReportSummary> {
  const where: CategoryWhere = { archivedAt: null };
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = { slug: filters.category };

  const [total, conditionGroups, donut, categories] = await Promise.all([
    db.asset.count({ where }),
    db.asset.groupBy({
      by: ["condition"],
      where,
      _count: { _all: true },
    }),
    statusDonut(where, "Status breakdown", "Share of the filtered fleet"),
    categoryBars(where, "By category", "Top categories"),
  ]);

  const byStatus = await db.asset.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });
  const countFor = (status: string) =>
    byStatus.find((group) => group.status === status)?._count._all ?? 0;

  const kpis: KpiCard[] = [
    { label: "Assets in report", value: num(total), hint: "Matching filters" },
    {
      label: "Available",
      value: num(countFor("AVAILABLE")),
      tone: "success",
      hint: share(countFor("AVAILABLE"), total),
    },
    {
      label: "Checked out",
      value: num(countFor("CHECKED_OUT")),
      hint: share(countFor("CHECKED_OUT"), total),
    },
    {
      label: "In maintenance",
      value: num(countFor("MAINTENANCE")),
      tone: countFor("MAINTENANCE") > 0 ? "warning" : undefined,
      hint: share(countFor("MAINTENANCE"), total),
    },
  ];

  const conditionChart: ChartBlock = {
    kind: "bars",
    id: "condition-breakdown",
    title: "Condition profile",
    subtitle: "Reported condition across the fleet",
    data: conditionGroups
      .map((group) => ({
        label: CONDITION_LABELS[group.condition],
        value: group._count._all,
        color: CONDITION_COLOR[group.condition],
      }))
      .sort((a, b) => b.value - a.value),
  };

  return { kpis, charts: [donut, categories, conditionChart] };
}

async function custodySummary(filters: ReportFilters): Promise<ReportSummary> {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (filters.department) {
    where.employee = {
      department: { name: { equals: filters.department, mode: "insensitive" } },
    };
  }

  const [assignments, overdue, departmentChart] = await Promise.all([
    db.assetAssignment.findMany({
      where,
      select: {
        employeeId: true,
        expectedReturnAt: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
    db.assetAssignment.count({
      where: { ...where, expectedReturnAt: { lt: new Date() } },
    }),
    custodyByDepartment(where, "Assets held by department"),
  ]);

  const holders = new Map<string, { name: string; department: string; count: number }>();
  for (const assignment of assignments) {
    const existing = holders.get(assignment.employee.id);
    if (existing) existing.count += 1;
    else
      holders.set(assignment.employee.id, {
        name: assignment.employee.fullName,
        department: assignment.employee.department.name,
        count: 1,
      });
  }
  const topHolders: ChartBlock = {
    kind: "bars",
    id: "top-holders",
    title: "Top custodians",
    subtitle: "Employees holding the most assets",
    data: [...holders.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((holder) => ({
        label: holder.name,
        value: holder.count,
        hint: holder.department,
        color: COLORS.checkedOut,
      })),
  };

  const kpis: KpiCard[] = [
    { label: "Active assignments", value: num(assignments.length), hint: "Assets currently handed out" },
    {
      label: "Employees holding assets",
      value: num(holders.size),
      hint: "Distinct custodians",
    },
    {
      label: "Overdue returns",
      value: num(overdue),
      tone: overdue > 0 ? "danger" : "success",
      hint: overdue > 0 ? "Past expected return date" : "All returns on schedule",
    },
    {
      label: "Departments involved",
      value: num(new Set([...holders.values()].map((holder) => holder.department)).size),
      hint: "With at least one asset",
    },
  ];

  return { kpis, charts: [departmentChart, topHolders] };
}

async function maintenanceSummary(filters: ReportFilters): Promise<ReportSummary> {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;

  const twelveMonthsAgo = (() => {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - 12);
    return date;
  })();

  const [
    statusGroups,
    typeGroups,
    allRecords,
    recentRecords,
    maintenanceChart,
  ] = await Promise.all([
    db.maintenanceRecord.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    db.maintenanceRecord.groupBy({
      by: ["type"],
      where,
      _count: { _all: true },
    }),
    db.maintenanceRecord.count({ where }),
    db.maintenanceRecord.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { cost: true, downtimeHours: true, completedAt: true },
    }),
    maintenanceMonthly(twelveMonthsAgo, "Monthly maintenance cost"),
  ]);

  const countFor = (status: string) =>
    statusGroups.find((group) => group.status === status)?._count._all ?? 0;
  const spend = recentRecords.reduce(
    (sum, record) => sum + Number(record.cost ?? 0),
    0
  );
  const downtime = recentRecords.reduce(
    (sum, record) => sum + Number(record.downtimeHours ?? 0),
    0
  );
  const open = countFor("OPEN") + countFor("IN_PROGRESS");

  const statusChart: ChartBlock = {
    kind: "donut",
    id: "maintenance-status",
    title: "Work orders by status",
    subtitle: `${num(allRecords)} records total`,
    slices: statusGroups
      .map((group) => ({
        label: MAINTENANCE_STATUS_LABELS[group.status],
        value: group._count._all,
        color:
          group.status === "OPEN"
            ? COLORS.missing
            : group.status === "IN_PROGRESS"
              ? COLORS.maintenance
              : group.status === "COMPLETED"
                ? COLORS.available
                : COLORS.retired,
      }))
      .filter((slice) => slice.value > 0),
  };

  const typeChart: ChartBlock = {
    kind: "bars",
    id: "maintenance-type",
    title: "By maintenance type",
    subtitle: "All matching work orders",
    data: typeGroups
      .map((group) => ({
        label: MAINTENANCE_TYPE_LABELS[group.type],
        value: group._count._all,
        color: COLORS.accent,
      }))
      .sort((a, b) => b.value - a.value),
  };

  const kpis: KpiCard[] = [
    {
      label: "Open work orders",
      value: num(open),
      tone: open > 0 ? "warning" : "success",
      hint: open > 0 ? "Needs attention" : "Nothing pending",
    },
    { label: "Completed (12m)", value: num(recentRecords.filter((r) => r.completedAt).length), hint: "Closed records" },
    { label: "Spend (12m)", value: money(spend), hint: "Recorded costs" },
    { label: "Downtime (12m)", value: `${Math.round(downtime).toLocaleString("en-US")} h`, hint: "Across all records" },
  ];

  return { kpis, charts: [maintenanceChart, statusChart, typeChart] };
}

async function missingDamagedSummary(): Promise<ReportSummary> {
  const where: CategoryWhere = {
    archivedAt: null,
    OR: [
      { status: { in: ["MISSING", "DAMAGED"] } },
      { condition: { in: ["DAMAGED", "MALFUNCTIONING"] } },
    ],
  };

  const [total, statusGroups, conditionGroups, categories] = await Promise.all([
    db.asset.count({ where }),
    db.asset.groupBy({ by: ["status"], where, _count: { _all: true } }),
    db.asset.groupBy({ by: ["condition"], where, _count: { _all: true } }),
    categoryBars(where, "Where the damage sits", "Affected assets by category"),
  ]);

  const countFor = (status: string) =>
    statusGroups.find((group) => group.status === status)?._count._all ?? 0;

  const statusChart: ChartBlock = {
    kind: "donut",
    id: "attention-status",
    title: "Attention by status",
    subtitle: `${num(total)} assets affected`,
    slices: [
      { label: "Missing", value: countFor("MISSING"), color: COLORS.missing },
      { label: "Damaged status", value: countFor("DAMAGED"), color: COLORS.damaged },
      {
        label: "Faulty condition",
        value: conditionGroups
          .filter((group) => group.condition === "MALFUNCTIONING")
          .reduce((sum, group) => sum + group._count._all, 0),
        color: COLORS.maintenance,
      },
    ].filter((slice) => slice.value > 0),
  };

  const conditionChart: ChartBlock = {
    kind: "bars",
    id: "attention-condition",
    title: "By reported condition",
    data: conditionGroups
      .map((group) => ({
        label: CONDITION_LABELS[group.condition],
        value: group._count._all,
        color: CONDITION_COLOR[group.condition],
      }))
      .sort((a, b) => b.value - a.value),
  };

  const kpis: KpiCard[] = [
    { label: "Needs attention", value: num(total), tone: "danger", hint: "Missing or damaged" },
    { label: "Missing", value: num(countFor("MISSING")), tone: countFor("MISSING") > 0 ? "danger" : undefined, hint: "Reported missing" },
    { label: "Damaged", value: num(countFor("DAMAGED")), tone: "warning", hint: "Damaged status" },
    {
      label: "Malfunctioning",
      value: num(
        conditionGroups.find((group) => group.condition === "MALFUNCTIONING")
          ?._count._all ?? 0
      ),
      hint: "Faulty but in custody",
    },
  ];

  return { kpis, charts: [statusChart, conditionChart, categories] };
}

async function stockSummary(filters: ReportFilters): Promise<ReportSummary> {
  const all = await db.inventoryItem.findMany({
    select: {
      name: true,
      category: true,
      quantity: true,
      minimumStock: true,
    },
  });
  const base = filters.low
    ? all.filter(
        (item) => item.minimumStock > 0 && item.quantity < item.minimumStock
      )
    : all;

  const low = base.filter(
    (item) => item.minimumStock > 0 && item.quantity < item.minimumStock
  );
  const out = base.filter((item) => item.quantity === 0);
  const healthy = base.length - low.length;
  const totalUnits = base.reduce((sum, item) => sum + item.quantity, 0);

  const healthChart: ChartBlock = {
    kind: "donut",
    id: "stock-health-detail",
    title: "Stock health",
    subtitle: `${num(base.length)} SKUs`,
    slices: [
      { label: "Healthy", value: healthy, color: COLORS.inStock },
      { label: "Below minimum", value: low.length, color: COLORS.low },
      { label: "Out of stock", value: out.length, color: COLORS.out },
    ].filter((slice) => slice.value > 0),
  };

  const replenishChart: ChartBlock = {
    kind: "bars",
    id: "replenish-list",
    title: "Replenishment queue",
    subtitle: "Lowest stock vs. minimum",
    unit: "on hand",
    data: low
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 8)
      .map((item) => ({
        label: item.name,
        value: item.quantity,
        hint: `min ${item.minimumStock}`,
        color: item.quantity === 0 ? COLORS.out : COLORS.low,
      })),
  };

  const byCategory = new Map<string, number>();
  for (const item of base) {
    const key = item.category || "Uncategorized";
    byCategory.set(key, (byCategory.get(key) ?? 0) + item.quantity);
  }
  const categoryChart: ChartBlock = {
    kind: "bars",
    id: "stock-category",
    title: "Units by category",
    data: [...byCategory.entries()]
      .map(([label, value]) => ({ label, value, color: COLORS.accent }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
  };

  const kpis: KpiCard[] = [
    { label: "SKUs tracked", value: num(base.length), hint: filters.low ? "Low stock filter on" : "All stock items" },
    {
      label: "Below minimum",
      value: num(low.length),
      tone: low.length > 0 ? "warning" : "success",
      hint: "Reorder suggested",
    },
    {
      label: "Out of stock",
      value: num(out.length),
      tone: out.length > 0 ? "danger" : "success",
      hint: "Zero on hand",
    },
    { label: "Units on hand", value: num(totalUnits), hint: "Across all SKUs" },
  ];

  return { kpis, charts: [healthChart, replenishChart, categoryChart] };
}

async function assetHistorySummary(filters: ReportFilters): Promise<ReportSummary> {
  const where: Record<string, unknown> = {};
  if (inEnum(AssetTransactionAction, filters.action)) {
    where.action = filters.action;
  }
  if (filters.from || filters.to) {
    const range: { gte?: Date; lt?: Date } = {};
    if (filters.from) {
      const start = new Date(filters.from);
      if (!Number.isNaN(start.getTime())) range.gte = start;
    }
    if (filters.to) {
      const end = new Date(filters.to);
      if (!Number.isNaN(end.getTime())) {
        end.setDate(end.getDate() + 1);
        range.lt = end;
      }
    }
    where.createdAt = range;
  }

  const gte =
    (where.createdAt as { gte?: Date } | undefined)?.gte ?? startOfUtcDay(30);

  const [total, actionGroups, trendChart] = await Promise.all([
    db.assetTransaction.count({ where }),
    db.assetTransaction.groupBy({
      by: ["action"],
      where,
      _count: { _all: true },
    }),
    checkoutTrend(gte, "Daily activity", "Check-outs vs. returns"),
  ]);

  const actionChart: ChartBlock = {
    kind: "donut",
    id: "action-mix",
    title: "Action mix",
    subtitle: `${num(total)} transactions`,
    slices: actionGroups
      .map((group, index) => ({
        label: ACTION_LABELS[group.action],
        value: group._count._all,
        color: COLORS.series[index % COLORS.series.length],
      }))
      .sort((a, b) => b.value - a.value),
  };

  const countFor = (action: string) =>
    actionGroups.find((group) => group.action === action)?._count._all ?? 0;

  const kpis: KpiCard[] = [
    { label: "Transactions", value: num(total), hint: "Matching the filters" },
    { label: "Check-outs", value: num(countFor("CHECKED_OUT")), hint: "Out to employees" },
    { label: "Returns", value: num(countFor("RETURNED")), hint: "Back in store" },
    { label: "Transfers", value: num(countFor("TRANSFERRED")), hint: "Custody changes" },
  ];

  return { kpis, charts: [actionChart, trendChart] };
}

export async function getReportSummary(
  type: ReportType,
  filters: ReportFilters
): Promise<ReportSummary> {
  switch (type) {
    case "overview":
      return overviewSummary();
    case "asset-inventory":
      return assetInventorySummary(filters);
    case "custody":
      return custodySummary(filters);
    case "maintenance":
      return maintenanceSummary(filters);
    case "missing-damaged":
      return missingDamagedSummary();
    case "stock":
      return stockSummary(filters);
    case "asset-history":
      return assetHistorySummary(filters);
  }
}

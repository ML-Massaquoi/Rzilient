import { db } from "@/lib/db";
import type { AssetStatus } from "@/generated/prisma/enums";

export const STATUS_COUNT_ORDER: AssetStatus[] = [
  "AVAILABLE",
  "CHECKED_OUT",
  "MAINTENANCE",
  "DAMAGED",
  "MISSING",
  "RETIRED",
  "DISPOSED",
];

export function getDashboardStats() {
  const now = new Date();

  return Promise.all([
    db.asset.groupBy({ by: ["status"], _count: { _all: true } }),
    db.asset.count(),
    db.asset.groupBy({ by: ["categoryId"], _count: { _all: true } }),
    db.assetCategory.findMany({ select: { id: true, name: true } }),
    db.employee.count({ where: { status: "ACTIVE" } }),
    db.assetAssignment.count({
      where: { status: "ACTIVE", expectedReturnAt: { lt: now } },
    }),
    db.assetAssignment.findMany({
      where: { status: "ACTIVE", expectedReturnAt: { lt: now } },
      take: 5,
      orderBy: { expectedReturnAt: "asc" },
      select: {
        id: true,
        expectedReturnAt: true,
        asset: { select: { assetTag: true, name: true } },
        employee: { select: { fullName: true } },
      },
    }),
    db.maintenanceRecord.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    db.inventoryItem.findMany({
      where: { minimumStock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        minimumStock: true,
      },
    }),
    db.assetTransaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        createdAt: true,
        notes: true,
        asset: { select: { assetTag: true, name: true } },
        performedBy: { select: { name: true } },
        employee: { select: { fullName: true } },
        fromEmployee: { select: { fullName: true } },
        toEmployee: { select: { fullName: true } },
      },
    }),
    db.asset.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        assetTag: true,
        name: true,
        status: true,
        createdAt: true,
      },
    }),
  ]).then(
    ([
      statusGroups,
      total,
      categoryGroups,
      categories,
      activeEmployees,
      overdueCount,
      overdueList,
      openMaintenance,
      inventoryItems,
      recentTransactions,
      recentAssets,
    ]) => {
      const byStatus = Object.fromEntries(
        statusGroups.map((group) => [group.status, group._count._all])
      ) as Partial<Record<AssetStatus, number>>;

      const categoryNameById = new Map(
        categories.map((category) => [category.id, category.name])
      );

      const distribution = categoryGroups
        .map((group) => ({
          id: group.categoryId,
          name: categoryNameById.get(group.categoryId) ?? "Uncategorized",
          count: group._count._all,
        }))
        .sort((a, b) => b.count - a.count);

      const lowStockItems = inventoryItems.filter(
        (item) => item.quantity < item.minimumStock
      );

      const count = (status: AssetStatus) => byStatus[status] ?? 0;

      return {
        totals: {
          total,
          available: count("AVAILABLE"),
          checkedOut: count("CHECKED_OUT"),
          maintenance: count("MAINTENANCE"),
          damaged: count("DAMAGED"),
          missing: count("MISSING"),
          retired: count("RETIRED") + count("DISPOSED"),
        },
        attention: {
          overdue: overdueCount,
          damaged: count("DAMAGED"),
          missing: count("MISSING"),
          lowStock: lowStockItems.length,
        },
        overdueList,
        lowStockItems: lowStockItems.slice(0, 5),
        openMaintenance,
        activeEmployees,
        distribution,
        recentTransactions,
        recentAssets,
      };
    }
  );
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

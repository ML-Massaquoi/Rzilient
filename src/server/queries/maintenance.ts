import { db } from "@/lib/db";
import { MaintenanceStatus, MaintenanceType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export const MAINTENANCE_PAGE_SIZE = 20;

export type MaintenanceListParams = {
  q?: string;
  status?: string;
  type?: string;
  page?: number;
};

function isValidEnum<T extends Record<string, string>>(
  values: T,
  value: string | undefined
): value is T[keyof T] {
  return typeof value === "string" && value in values;
}

const RECORD_SELECT = {
  id: true,
  title: true,
  type: true,
  status: true,
  issue: true,
  actionTaken: true,
  cost: true,
  technician: true,
  downtimeHours: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  asset: {
    select: { id: true, assetTag: true, name: true, status: true },
  },
  reportedBy: { select: { name: true } },
} satisfies Prisma.MaintenanceRecordSelect;

export async function listMaintenanceRecords(params: MaintenanceListParams) {
  const q = params.q?.trim() || undefined;
  const where: Prisma.MaintenanceRecordWhereInput = {};

  if (isValidEnum(MaintenanceStatus, params.status)) {
    where.status = params.status;
  }
  if (isValidEnum(MaintenanceType, params.type)) {
    where.type = params.type;
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { technician: { contains: q, mode: "insensitive" } },
      { issue: { contains: q, mode: "insensitive" } },
      { asset: { assetTag: { contains: q, mode: "insensitive" } } },
      { asset: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const total = await db.maintenanceRecord.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / MAINTENANCE_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);

  const items = await db.maintenanceRecord.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    skip: (page - 1) * MAINTENANCE_PAGE_SIZE,
    take: MAINTENANCE_PAGE_SIZE,
    select: RECORD_SELECT,
  });

  return { items, total, page, pageCount };
}

export type MaintenanceListItem = Awaited<
  ReturnType<typeof listMaintenanceRecords>
>["items"][number];

export async function getMaintenanceStats() {
  const [open, inProgress, completed, cancelled, costAgg] = await Promise.all([
    db.maintenanceRecord.count({ where: { status: "OPEN" } }),
    db.maintenanceRecord.count({ where: { status: "IN_PROGRESS" } }),
    db.maintenanceRecord.count({ where: { status: "COMPLETED" } }),
    db.maintenanceRecord.count({ where: { status: "CANCELLED" } }),
    db.maintenanceRecord.aggregate({
      where: { status: "COMPLETED", cost: { not: null } },
      _sum: { cost: true },
    }),
  ]);
  return {
    open,
    inProgress,
    completed,
    cancelled,
    active: open + inProgress,
    totalCost: costAgg._sum.cost ?? 0,
  };
}

/** Assets eligible for a new maintenance record (§79: retired/disposed excluded). */
export function searchMaintenanceAssets(query: string, limit = 8) {
  const q = query.trim();
  if (!q) return Promise.resolve([]);
  return db.asset.findMany({
    where: {
      archivedAt: null,
      status: { notIn: ["RETIRED", "DISPOSED"] },
      OR: [
        { assetTag: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { serialNumber: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      assetTag: true,
      name: true,
      status: true,
      condition: true,
      serialNumber: true,
      brand: true,
      model: true,
      category: { select: { name: true } },
      _count: {
        select: {
          maintenanceRecords: {
            where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          },
        },
      },
    },
  });
}

export type MaintenanceAssetHit = Awaited<
  ReturnType<typeof searchMaintenanceAssets>
>[number];

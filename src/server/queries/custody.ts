import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const ASSIGNMENT_SELECT = {
  id: true,
  status: true,
  assignedAt: true,
  expectedReturnAt: true,
  conditionAtCheckout: true,
  accessoriesOut: true,
  reason: true,
  notes: true,
  asset: {
    select: {
      id: true,
      assetTag: true,
      name: true,
      serialNumber: true,
      brand: true,
      model: true,
      status: true,
      condition: true,
      category: { select: { name: true } },
    },
  },
  employee: {
    select: {
      id: true,
      fullName: true,
      fiaNumber: true,
      employeeNo: true,
      position: true,
      phone: true,
      department: { select: { name: true } },
    },
  },
  assignedBy: { select: { name: true } },
} satisfies Prisma.AssetAssignmentSelect;

/** Search assets that can be checked out (AVAILABLE, no active assignment). */
export function searchAvailableAssets(query: string, limit = 8) {
  const q = query.trim();
  if (!q) return Promise.resolve([]);
  return db.asset.findMany({
    where: {
      status: "AVAILABLE",
      activeAssignmentId: null,
      OR: [
        { assetTag: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { serialNumber: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { fqdn: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ assetTag: "asc" }],
    take: limit,
    select: {
      id: true,
      assetTag: true,
      name: true,
      serialNumber: true,
      brand: true,
      model: true,
      status: true,
      condition: true,
      category: { select: { name: true } },
    },
  });
}

/** An asset pre-selected for check-out, only when it is actually assignable. */
export function getCheckoutAsset(id: string) {
  return db.asset.findFirst({
    where: { id, status: "AVAILABLE", activeAssignmentId: null },
    select: {
      id: true,
      assetTag: true,
      name: true,
      serialNumber: true,
      brand: true,
      model: true,
      condition: true,
      status: true,
      category: { select: { name: true } },
    },
  });
}

export type CheckoutAsset = NonNullable<
  Awaited<ReturnType<typeof getCheckoutAsset>>
>;

/** Active assignments (check-outs) with optional search + overdue filter. */
export async function listActiveAssignments(params: {
  q?: string;
  overdueOnly?: boolean;
  limit?: number;
}) {
  const q = params.q?.trim() || undefined;
  const now = new Date();
  const where: Prisma.AssetAssignmentWhereInput = { status: "ACTIVE" };

  if (q) {
    where.OR = [
      { asset: { assetTag: { contains: q, mode: "insensitive" } } },
      { asset: { name: { contains: q, mode: "insensitive" } } },
      { asset: { serialNumber: { contains: q, mode: "insensitive" } } },
      { employee: { fullName: { contains: q, mode: "insensitive" } } },
      { employee: { fiaNumber: { contains: q, mode: "insensitive" } } },
      { employee: { department: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (params.overdueOnly) {
    where.expectedReturnAt = { lt: now };
  }

  const [items, overdueCount, activeCount] = await Promise.all([
    db.assetAssignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      take: params.limit ?? 100,
      select: ASSIGNMENT_SELECT,
    }),
    db.assetAssignment.count({
      where: { status: "ACTIVE", expectedReturnAt: { lt: now } },
    }),
    db.assetAssignment.count({ where: { status: "ACTIVE" } }),
  ]);

  return { items, overdueCount, activeCount };
}

export function getActiveAssignment(id: string) {
  return db.assetAssignment.findFirst({
    where: { id, status: "ACTIVE" },
    select: ASSIGNMENT_SELECT,
  });
}

export type ActiveAssignment = NonNullable<
  Awaited<ReturnType<typeof getActiveAssignment>>
>;

export type ActiveAssignmentItem = (Awaited<
  ReturnType<typeof listActiveAssignments>
>)["items"][number];

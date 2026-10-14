import { db } from "@/lib/db";
import { StockTransactionType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export const INVENTORY_PAGE_SIZE = 20;
export const STOCK_TX_PAGE_SIZE = 20;

export type InventoryListParams = {
  q?: string;
  category?: string;
  locationId?: string;
  page?: number;
};

function isValidEnum<T extends Record<string, string>>(
  values: T,
  value: string | undefined
): value is T[keyof T] {
  return typeof value === "string" && value in values;
}

const ITEM_SELECT = {
  id: true,
  name: true,
  sku: true,
  category: true,
  unit: true,
  quantity: true,
  minimumStock: true,
  reorderLevel: true,
  notes: true,
  locationId: true,
  updatedAt: true,
  location: { select: { name: true } },
} satisfies Prisma.InventoryItemSelect;

export type InventoryListItem = {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  unit: string;
  quantity: number;
  minimumStock: number;
  reorderLevel: number | null;
  notes: string | null;
  locationId: string | null;
  updatedAt: Date;
  location: { name: string } | null;
};

export function isLowStock(item: {
  quantity: number;
  minimumStock: number;
}): boolean {
  return item.minimumStock > 0 && item.quantity < item.minimumStock;
}

export async function listInventoryItems(params: InventoryListParams) {
  const q = params.q?.trim() || undefined;
  const where: Prisma.InventoryItemWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { location: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (params.category) {
    where.category = { equals: params.category, mode: "insensitive" };
  }
  if (params.locationId) {
    where.locationId = params.locationId;
  }

  const total = await db.inventoryItem.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / INVENTORY_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);

  const items = await db.inventoryItem.findMany({
    where,
    orderBy: [{ name: "asc" }],
    skip: (page - 1) * INVENTORY_PAGE_SIZE,
    take: INVENTORY_PAGE_SIZE,
    select: ITEM_SELECT,
  });

  return { items, total, page, pageCount };
}

/** Items whose quantity is below their configured minimum (§31). */
export async function getLowStockItems(limit = 50, locationId?: string) {
  const candidates = await db.inventoryItem.findMany({
    where: {
      minimumStock: { gt: 0 },
      ...(locationId ? { locationId } : {}),
    },
    orderBy: { name: "asc" },
    select: ITEM_SELECT,
  });
  return candidates.filter(isLowStock).slice(0, limit);
}

export async function getInventoryStats() {
  const [totalItems, quantityAgg, minimumCandidates] = await Promise.all([
    db.inventoryItem.count(),
    db.inventoryItem.aggregate({ _sum: { quantity: true } }),
    db.inventoryItem.findMany({
      where: { minimumStock: { gt: 0 } },
      select: { quantity: true, minimumStock: true },
    }),
  ]);
  return {
    totalItems,
    totalUnits: quantityAgg._sum.quantity ?? 0,
    lowStock: minimumCandidates.filter(isLowStock).length,
  };
}

export async function getInventoryFilterOptions() {
  const rows = await db.inventoryItem.findMany({
    where: { category: { not: null } },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows
    .map((row) => row.category)
    .filter((value): value is string => Boolean(value));
}

export function getLocations() {
  return db.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export type StockTxListParams = {
  q?: string;
  type?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
};

export async function listStockTransactions(params: StockTxListParams) {
  const q = params.q?.trim() || undefined;
  const where: Prisma.InventoryTransactionWhereInput = {};

  if (isValidEnum(StockTransactionType, params.type)) {
    where.type = params.type;
  }
  if (params.userId) {
    where.performedById = params.userId;
  }
  if (q) {
    where.OR = [
      { item: { name: { contains: q, mode: "insensitive" } } },
      { item: { sku: { contains: q, mode: "insensitive" } } },
      { reference: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }
  const createdAt: Prisma.DateTimeFilter = {};
  const fromDate = params.from ? new Date(params.from) : null;
  const toDate = params.to ? new Date(params.to) : null;
  if (fromDate && !Number.isNaN(fromDate.getTime())) {
    createdAt.gte = fromDate;
  }
  if (toDate && !Number.isNaN(toDate.getTime())) {
    const end = new Date(toDate);
    end.setDate(end.getDate() + 1);
    createdAt.lt = end;
  }
  if (createdAt.gte || createdAt.lt) {
    where.createdAt = createdAt;
  }

  const total = await db.inventoryTransaction.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / STOCK_TX_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);

  const items = await db.inventoryTransaction.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    skip: (page - 1) * STOCK_TX_PAGE_SIZE,
    take: STOCK_TX_PAGE_SIZE,
    select: {
      id: true,
      type: true,
      quantityChange: true,
      quantityAfter: true,
      reference: true,
      notes: true,
      createdAt: true,
      item: { select: { id: true, name: true, sku: true } },
      performedBy: { select: { id: true, name: true } },
    },
  });

  return { items, total, page, pageCount };
}

export type StockTxListItem = Awaited<
  ReturnType<typeof listStockTransactions>
>["items"][number];

export function listStockUsers() {
  return db.user.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

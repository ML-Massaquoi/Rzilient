import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { WAREHOUSE_ROOT_CODE } from "@/lib/warehouses";
import { isLowStock } from "@/server/queries/inventory";

export const WAREHOUSE_PAGE_SIZE = 25;

export async function getWarehouseRootId() {
  const root = await db.location.findUnique({
    where: { code: WAREHOUSE_ROOT_CODE },
    select: { id: true },
  });
  return root?.id ?? null;
}

export type WarehouseOption = { id: string; name: string; code: string | null };

export async function listWarehouseOptions(): Promise<WarehouseOption[]> {
  const rootId = await getWarehouseRootId();
  if (!rootId) return [];
  return db.location.findMany({
    where: { parentId: rootId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}

export type WarehouseCard = WarehouseOption & {
  deviceCount: number;
  stockItemCount: number;
  lowStockCount: number;
};

/** The three warehouses with device / stock-item counts for the overview. */
export async function listWarehousesWithCounts(): Promise<WarehouseCard[]> {
  const warehouses = await listWarehouseOptions();
  if (warehouses.length === 0) return [];
  const ids = warehouses.map((w) => w.id);

  const [deviceCounts, stockCounts, lowStockCandidates] = await Promise.all([
    db.asset.groupBy({
      by: ["locationId"],
      where: { locationId: { in: ids }, archivedAt: null },
      _count: { _all: true },
    }),
    db.inventoryItem.groupBy({
      by: ["locationId"],
      where: { locationId: { in: ids } },
      _count: { _all: true },
    }),
    db.inventoryItem.findMany({
      where: { locationId: { in: ids }, minimumStock: { gt: 0 } },
      select: { locationId: true, quantity: true, minimumStock: true },
    }),
  ]);

  const devicesByLocation = new Map(
    deviceCounts.map((row) => [row.locationId, row._count._all])
  );
  const itemsByLocation = new Map(
    stockCounts.map((row) => [row.locationId, row._count._all])
  );
  const lowByLocation = new Map<string, number>();
  for (const item of lowStockCandidates) {
    if (!item.locationId || !isLowStock(item)) continue;
    lowByLocation.set(
      item.locationId,
      (lowByLocation.get(item.locationId) ?? 0) + 1
    );
  }

  return warehouses.map((warehouse) => ({
    ...warehouse,
    deviceCount: devicesByLocation.get(warehouse.id) ?? 0,
    stockItemCount: itemsByLocation.get(warehouse.id) ?? 0,
    lowStockCount: lowByLocation.get(warehouse.id) ?? 0,
  }));
}

/** Resolves an id only when it is one of the warehouses (child of the WH root). */
export async function getWarehouse(id: string): Promise<WarehouseOption | null> {
  const rootId = await getWarehouseRootId();
  if (!rootId) return null;
  const row = await db.location.findFirst({
    where: { id, parentId: rootId },
    select: { id: true, name: true, code: true },
  });
  return row;
}

export type WarehouseAssetParams = {
  locationId: string;
  q?: string;
  status?: string;
  page?: number;
};

const WAREHOUSE_ASSET_SELECT = {
  id: true,
  assetTag: true,
  name: true,
  brand: true,
  model: true,
  serialNumber: true,
  status: true,
  condition: true,
  parentId: true,
  archivedAt: true,
  category: { select: { name: true } },
  department: { select: { name: true } },
  activeAssignment: {
    select: { employee: { select: { fullName: true } } },
  },
  attachments: {
    where: { kind: "ASSET_PHOTO" },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { id: true, filename: true },
  },
} satisfies Prisma.AssetSelect;

export async function listWarehouseAssets(params: WarehouseAssetParams) {
  const q = params.q?.trim() || undefined;
  const where: Prisma.AssetWhereInput = {
    locationId: params.locationId,
    archivedAt: null,
  };

  if (q) {
    where.OR = [
      { assetTag: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { serialNumber: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
    ];
  }
  if (params.status) {
    where.status = params.status as Prisma.EnumAssetStatusFilter["equals"];
  }

  const total = await db.asset.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / WAREHOUSE_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);

  const items = await db.asset.findMany({
    where,
    orderBy: [{ assetTag: "asc" }],
    skip: (page - 1) * WAREHOUSE_PAGE_SIZE,
    take: WAREHOUSE_PAGE_SIZE,
    select: WAREHOUSE_ASSET_SELECT,
  });

  return { items, total, page, pageCount };
}

export type WarehouseAssetListItem = Awaited<
  ReturnType<typeof listWarehouseAssets>
>["items"][number];

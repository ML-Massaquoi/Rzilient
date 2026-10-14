import { db } from "@/lib/db";
import {
  AssetCondition,
  AssetStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export const ASSET_PAGE_SIZE = 20;

/** Serialized peripherals tracked as assets; everything else is a "device". */
export const ACCESSORY_CATEGORY_SLUGS = ["storage-device", "it-tool"];

export type AssetListParams = {
  q?: string;
  status?: string;
  category?: string;
  condition?: string;
  kind?: "device" | "accessory";
  page?: number;
};

const ASSET_LIST_SELECT = {
  id: true,
  assetTag: true,
  name: true,
  status: true,
  condition: true,
  brand: true,
  model: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  location: { select: { name: true } },
  attachments: {
    where: { kind: "ASSET_PHOTO" as const },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { id: true },
  },
  activeAssignment: {
    select: {
      id: true,
      employee: {
        select: {
          fullName: true,
          department: { select: { name: true } },
          attachments: {
            where: { kind: "EMPLOYEE_PHOTO" as const },
            orderBy: { createdAt: "desc" as const },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  },
} satisfies Prisma.AssetSelect;

export async function getAssetFilterOptions(kind?: "device" | "accessory") {
  const rows = await db.assetCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true },
  });
  if (!kind) return rows;
  return rows.filter((row) =>
    kind === "accessory"
      ? ACCESSORY_CATEGORY_SLUGS.includes(row.slug)
      : !ACCESSORY_CATEGORY_SLUGS.includes(row.slug)
  );
}

function isValidEnum<T extends Record<string, string>>(
  values: T,
  value: string | undefined
): value is T[keyof T] {
  return typeof value === "string" && value in values;
}

export async function listAssets(params: AssetListParams) {
  const q = params.q?.trim() || undefined;
  const where: Prisma.AssetWhereInput = { archivedAt: null };

  if (isValidEnum(AssetStatus, params.status)) {
    where.status = params.status;
  }
  if (isValidEnum(AssetCondition, params.condition)) {
    where.condition = params.condition;
  }
  if (params.kind === "accessory") {
    where.category = { slug: { in: ACCESSORY_CATEGORY_SLUGS } };
  } else if (params.kind === "device") {
    where.category = { slug: { notIn: ACCESSORY_CATEGORY_SLUGS } };
  }
  if (params.category) {
    const category = await db.assetCategory.findUnique({
      where: { slug: params.category },
      select: { id: true },
    });
    // Unknown slug must yield zero results, not everything.
    where.categoryId = category?.id ?? "__no_such_category__";
  }
  if (q) {
    where.AND = [
      {
        OR: [
          { assetTag: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { serialNumber: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { model: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const total = await db.asset.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ASSET_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);

  const items = await db.asset.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { assetTag: "asc" }],
    skip: (page - 1) * ASSET_PAGE_SIZE,
    take: ASSET_PAGE_SIZE,
    select: ASSET_LIST_SELECT,
  });

  return { items, total, page, pageCount };
}

export type AssetListItem = Awaited<
  ReturnType<typeof listAssets>
>["items"][number];

export function getAssetDetail(id: string) {
  return db.asset.findUnique({
    where: { id },
    include: {
      category: true,
      location: true,
      createdBy: { select: { name: true } },
      attachments: {
        orderBy: { createdAt: "desc" },
        select: { id: true, kind: true, filename: true, createdAt: true },
      },
      activeAssignment: {
        include: {
          employee: {
            include: {
              department: true,
              location: true,
              attachments: {
                where: { kind: "EMPLOYEE_PHOTO" },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { id: true, filename: true },
              },
            },
          },
        },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          performedBy: { select: { name: true } },
          employee: { select: { fullName: true } },
          fromEmployee: { select: { fullName: true } },
          toEmployee: { select: { fullName: true } },
        },
      },
      maintenanceRecords: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { reportedBy: { select: { name: true } } },
      },
      _count: { select: { attachments: true, assignments: true } },
    },
  });
}

export type AssetDetail = NonNullable<Awaited<ReturnType<typeof getAssetDetail>>>;

/** Suggested next tag following the FIA-IT-##### convention. */
export async function getNextAssetTag(): Promise<string> {
  const rows = await db.asset.findMany({
    where: { assetTag: { startsWith: "FIA-IT-" } },
    select: { assetTag: true },
  });
  let max = 0;
  for (const row of rows) {
    const match = /^FIA-IT-(\d+)$/.exec(row.assetTag);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `FIA-IT-${String(max + 1).padStart(5, "0")}`;
}

export function getFormOptions() {
  return Promise.all([
    db.assetCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, requiresSerial: true },
    }),
    db.location.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.deviceModel.findMany({
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      select: { brand: true, name: true },
    }),
  ]).then(([categories, locations, departments, models]) => ({
    categories,
    locations,
    departments,
    brands: [...new Set(models.map((m) => m.brand))],
    modelNames: [...new Set(models.map((m) => m.name))].sort((a, b) =>
      a.localeCompare(b)
    ),
  }));
}

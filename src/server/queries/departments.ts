import { db } from "@/lib/db";
import { type Prisma as PrismaTypes } from "@/generated/prisma/client";

/**
 * Device→department attribution (user-facing rule):
 * - the asset's own departmentId when set (shared devices, manual), otherwise
 *   the department of the employee it is currently checked out to.
 */
export function deptAssetWhere(departmentId: string): PrismaTypes.AssetWhereInput {
  return {
    OR: [
      { departmentId },
      {
        departmentId: null,
        activeAssignment: { employee: { departmentId } },
      },
    ],
  };
}

export async function getDepartmentOverview(departmentId: string) {
  const department = await db.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) return null;

  const deviceWhere = deptAssetWhere(departmentId);

  const [employees, categoryCounts, categories, systems, accountCounts, deviceTotal, checkedOut] =
    await Promise.all([
      db.employee.findMany({
        where: { departmentId },
        orderBy: [{ status: "asc" }, { fullName: "asc" }],
        select: {
          id: true,
          fullName: true,
          position: true,
          unit: true,
          status: true,
          email: true,
          phone: true,
          attachments: {
            where: { kind: "EMPLOYEE_PHOTO" as const },
            take: 1,
            select: { id: true },
          },
          _count: {
            select: { assignments: { where: { status: "ACTIVE" as const } } },
          },
        },
      }),
      db.asset.groupBy({
        by: ["categoryId"],
        where: deviceWhere,
        _count: { _all: true },
      }),
      db.assetCategory.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, icon: true },
      }),
      db.itSystem.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      db.employeeAccount.groupBy({
        by: ["systemId"],
        where: { employee: { departmentId } },
        _count: { _all: true },
      }),
      db.asset.count({ where: deviceWhere }),
      db.asset.count({
        where: { AND: [deviceWhere, { activeAssignmentId: { not: null } }] },
      }),
    ]);

  const countByCategory = new Map(
    categoryCounts.map((row) => [row.categoryId, row._count._all])
  );
  const deviceTiles = categories
    .map((category) => ({
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      count: countByCategory.get(category.id) ?? 0,
    }))
    .filter((tile) => tile.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const countBySystem = new Map(
    accountCounts.map((row) => [row.systemId, row._count._all])
  );
  const systemTiles = systems.map((system) => ({
    id: system.id,
    slug: system.slug,
    name: system.name,
    count: countBySystem.get(system.id) ?? 0,
  }));

  const activeEmployees = employees.filter((e) => e.status === "ACTIVE").length;
  const inactiveEmployees = employees.length - activeEmployees;

  return {
    department,
    employees,
    deviceTiles,
    systemTiles,
    stats: {
      activeEmployees,
      inactiveEmployees,
      deviceTotal,
      checkedOut,
    },
  };
}

export type DepartmentOverview = NonNullable<
  Awaited<ReturnType<typeof getDepartmentOverview>>
>;

export async function getDepartmentCategoryAssets(
  departmentId: string,
  categorySlug: string
) {
  return db.asset.findMany({
    where: {
      AND: [deptAssetWhere(departmentId), { category: { slug: categorySlug } }],
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    take: 250,
    select: {
      id: true,
      assetTag: true,
      name: true,
      status: true,
      condition: true,
      serialNumber: true,
      brand: true,
      model: true,
      category: { select: { name: true, slug: true } },
      location: { select: { name: true } },
      activeAssignment: {
        select: { employee: { select: { id: true, fullName: true } } },
      },
    },
  });
}

export async function getDepartmentSystemAccounts(
  departmentId: string,
  systemSlug: string
) {
  const system = await db.itSystem.findUnique({
    where: { slug: systemSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!system) return null;

  const accounts = await db.employeeAccount.findMany({
    where: { systemId: system.id, employee: { departmentId } },
    orderBy: { employee: { fullName: "asc" } },
    select: {
      id: true,
      username: true,
      notes: true,
      employee: {
        select: {
          id: true,
          fullName: true,
          position: true,
          unit: true,
          status: true,
        },
      },
    },
  });

  return { system, accounts };
}

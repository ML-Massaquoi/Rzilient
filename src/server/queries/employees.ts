import { db } from "@/lib/db";
import { EmploymentStatus } from "@/generated/prisma/enums";
import { Prisma, type Prisma as PrismaTypes } from "@/generated/prisma/client";

export const EMPLOYEE_PAGE_SIZE = 20;

export type EmployeeListParams = {
  q?: string;
  department?: string;
  status?: string;
  page?: number;
};

const EMPLOYEE_LIST_SELECT = {
  id: true,
  fullName: true,
  fiaNumber: true,
  employeeNo: true,
  email: true,
  position: true,
  unit: true,
  status: true,
  phone: true,
  createdAt: true,
  department: { select: { id: true, name: true, code: true } },
  _count: {
    select: {
      assignments: { where: { status: "ACTIVE" as const } },
    },
  },
} satisfies PrismaTypes.EmployeeSelect;

export async function listEmployees(params: EmployeeListParams) {
  const q = params.q?.trim() || undefined;
  const where: PrismaTypes.EmployeeWhereInput = {};

  if (params.department) {
    where.departmentId = params.department;
  }
  if (params.status === "ACTIVE" || params.status === "INACTIVE") {
    where.status = params.status;
  }
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { fiaNumber: { contains: q, mode: "insensitive" } },
      { employeeNo: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { position: { contains: q, mode: "insensitive" } },
      { department: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const total = await db.employee.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / EMPLOYEE_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);

  const items = await db.employee.findMany({
    where,
    orderBy: [{ fullName: "asc" }],
    skip: (page - 1) * EMPLOYEE_PAGE_SIZE,
    take: EMPLOYEE_PAGE_SIZE,
    select: EMPLOYEE_LIST_SELECT,
  });

  return { items, total, page, pageCount };
}

export type EmployeeListItem = Awaited<
  ReturnType<typeof listEmployees>
>["items"][number];

export function getEmployeeDetail(id: string) {
  return db.employee.findUnique({
    where: { id },
    include: {
      department: true,
      location: true,
      createdBy: { select: { name: true } },
      attachments: {
        orderBy: { createdAt: "desc" },
        select: { id: true, kind: true, filename: true, createdAt: true },
      },
      assignments: {
        orderBy: { assignedAt: "desc" },
        take: 100,
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              name: true,
              status: true,
              condition: true,
              serialNumber: true,
              category: { select: { name: true } },
              attachments: {
                where: { kind: "ASSET_PHOTO" },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { id: true, filename: true },
              },
            },
          },
          assignedBy: { select: { name: true } },
          returnedBy: { select: { name: true } },
        },
      },
    },
  });
}

export type EmployeeDetail = NonNullable<
  Awaited<ReturnType<typeof getEmployeeDetail>>
>;

export async function getEmployeeFilterOptions() {
  const [departments, count] = await Promise.all([
    db.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    db.employee.count(),
  ]);
  return { departments, count };
}

/** Lightweight directory search — powers the employee selector in Phase 4. */
export function searchEmployees(query: string, limit = 10) {
  const q = query.trim();
  if (!q) return Promise.resolve([]);
  return db.employee.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { fiaNumber: { contains: q, mode: "insensitive" } },
        { employeeNo: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { department: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    orderBy: { fullName: "asc" },
    take: limit,
    select: {
      id: true,
      fullName: true,
      fiaNumber: true,
      employeeNo: true,
      position: true,
      phone: true,
      email: true,
      department: { select: { name: true } },
      attachments: {
        where: { kind: "EMPLOYEE_PHOTO" as const },
        take: 1,
        select: { id: true },
      },
      _count: {
        select: { assignments: { where: { status: "ACTIVE" as const } } },
      },
    },
  });
}

export async function listDepartmentsWithCounts() {
  const departments = await db.department.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          employees: { where: { status: EmploymentStatus.ACTIVE } },
        },
      },
    },
  });

  const departmentIds = departments.map((d) => d.id);
  const checkoutByDepartment = new Map<string, number>();
  if (departmentIds.length > 0) {
    const checkoutCounts = await db.$queryRaw<
      { departmentId: string; n: bigint }[]
    >`
      SELECT e."departmentId" as "departmentId", COUNT(*) as n
      FROM "AssetAssignment" a
      JOIN "Employee" e ON e."id" = a."employeeId"
      WHERE a."status" = 'ACTIVE' AND e."departmentId" IN (${Prisma.join(departmentIds)})
      GROUP BY e."departmentId"
    `;
    for (const row of checkoutCounts) {
      checkoutByDepartment.set(row.departmentId, Number(row.n));
    }
  }

  return {
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description,
      employeeCount: department._count.employees,
      checkedOutCount: checkoutByDepartment.get(department.id) ?? 0,
    })),
  };
}

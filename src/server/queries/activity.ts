import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const ACTIVITY_PAGE_SIZE = 25;

export type ActivityListParams = {
  q?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
};

export async function listAuditLogs(params: ActivityListParams) {
  const q = params.q?.trim() || undefined;
  const where: Prisma.AuditLogWhereInput = {};

  if (params.action) {
    where.action = params.action;
  }
  if (params.userId) {
    where.userId = params.userId;
  }
  if (q) {
    where.OR = [
      { summary: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
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

  const total = await db.auditLog.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);

  const items = await db.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    skip: (page - 1) * ACTIVITY_PAGE_SIZE,
    take: ACTIVITY_PAGE_SIZE,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      summary: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  return { items, total, page, pageCount };
}

export type ActivityItem = Awaited<ReturnType<typeof listAuditLogs>>["items"][number];

export async function getActivityFilterOptions() {
  const [actions, users] = await Promise.all([
    db.auditLog.findMany({
      distinct: ["action"],
      orderBy: { action: "asc" },
      select: { action: true },
    }),
    db.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { actions: actions.map((row) => row.action), users };
}

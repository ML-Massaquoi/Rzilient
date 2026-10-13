import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/**
 * Current authenticated user, verified against the database on every request.
 * Returns null when there is no valid, active session.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

/** For protected pages: redirects to /login when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For protected pages: redirects when unauthenticated or role is insufficient. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (roles.length > 0 && !roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Guard for server actions. Returns the user, or null when the caller is
 * not authenticated / not allowed. Actions must then return a friendly error
 * instead of performing the operation.
 */
export async function getActionUser(
  ...roles: Role[]
): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (roles.length > 0 && !roles.includes(user.role)) return null;
  return user;
}

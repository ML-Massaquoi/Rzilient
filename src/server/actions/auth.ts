"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth/session";
import { getCurrentUser } from "@/server/auth";
import {
  failure,
  logActionError,
  safeRedirectTarget,
} from "@/server/result";

export type LoginState = { ok: true } | { ok: false; error: string };

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
  next: z.string().optional(),
});

// Simple in-memory throttling for failed login attempts (per email).
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

async function clientIp(): Promise<string | null> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email") ?? undefined,
    password: formData.get("password") ?? undefined,
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return failure("Enter a valid email and password.");
  }

  const { email, password, next } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  if (isRateLimited(normalizedEmail)) {
    return failure(
      "Too many sign-in attempts. Please wait a few minutes and try again."
    );
  }

  try {
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        passwordHash: true,
        status: true,
        role: true,
      },
    });

    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) {
      return failure("Invalid email or password.");
    }
    if (user.status !== "ACTIVE") {
      return failure("This account has been disabled. Contact an administrator.");
    }

    attempts.delete(normalizedEmail);

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      db.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          summary: `${user.name} signed in`,
          ip: await clientIp(),
        },
      }),
    ]);

    await createSession(user.id);
  } catch (error) {
    logActionError("login", error);
    return failure(
      "Unable to sign in right now. Please refresh and try again."
    );
  }

  redirect(safeRedirectTarget(next));
}

export async function logout(): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (user) {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGOUT",
          entityType: "User",
          entityId: user.id,
          summary: `${user.name} signed out`,
          ip: await clientIp(),
        },
      });
    }
    await destroySession();
  } catch (error) {
    logActionError("logout", error);
    await destroySession().catch(() => undefined);
  }
  redirect("/login");
}

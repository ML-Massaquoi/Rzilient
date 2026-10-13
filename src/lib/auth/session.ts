import "server-only";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

/** Secure cookies are silently dropped by browsers over plain http://
 *  (localhost is the only exception). Mark the cookie Secure only when the
 *  app is actually reached over HTTPS — via NEXT_PUBLIC_APP_URL or a
 *  reverse proxy's x-forwarded-proto header. */
async function cookieSecure(): Promise<boolean> {
  if ((process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://")) {
    return true;
  }
  const h = await headers();
  return h.get("x-forwarded-proto") === "https";
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await cookieSecure(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    const userId = payload.sub;
    return typeof userId === "string" ? userId : null;
  } catch {
    return null;
  }
}

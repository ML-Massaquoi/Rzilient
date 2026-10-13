import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Route protection (Next.js 16 `proxy` convention — replaces middleware).
 *
 * This performs a cheap cookie-presence redirect only. Real verification
 * (signature, user status, role) happens server-side in layouts and actions.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLoginRoute = pathname === "/login";
  const isPublicRoute = pathname === "/scan" || pathname.startsWith("/scan/");

  if (!hasSession && !isLoginRoute && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isLoginRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

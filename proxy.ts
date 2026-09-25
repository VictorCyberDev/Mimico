import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * §2 — one place that decides who may see what. In Next 16 this file is
 * `proxy.ts` (the renamed `middleware.ts`).
 *
 * This deliberately does NOT call auth.api.getSession. Doing so puts a
 * database round trip in front of every request — including anonymous hits
 * on the public marketing landing page, which would then go down whenever
 * Postgres hiccups, and pay the latency on every navigation.
 *
 * Instead this is the optimistic cookie check Better Auth recommends for
 * middleware, and it is a first line of defence only, exactly as Next's own
 * guidance says. The authoritative checks run where the data actually is:
 *   - app/app/layout.tsx re-reads the real session before rendering anything
 *     gated, so a forged or stale cookie gets bounced there.
 *   - app/api/concierge and app/api/voice/* each re-check independently
 *     rather than trusting that a request reached them.
 */
const PUBLIC_PATHS = [
  "/",
  "/signup",
  "/login",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!hasSessionCookie && !isPublic) {
    const login = new URL("/login", request.url);
    // Come back to where they were headed once they're in.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (hasSessionCookie && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

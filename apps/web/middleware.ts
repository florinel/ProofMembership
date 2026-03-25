import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionCookieName, verifySessionToken } from "@/lib/auth/token";

type AppRole = "public" | "member" | "owner" | "admin";

const roleRank: Record<AppRole, number> = {
  public: 0,
  member: 1,
  owner: 2,
  admin: 3,
};

function getRole(request: NextRequest): AppRole {
  const fallbackCookieRole = request.cookies.get("proofmembership_role")?.value;
  if (process.env.NODE_ENV !== "production") {
    // Local UI work can rely on a simple cookie role before the full wallet-signature flow is
    // exercised through the browser.
    if (fallbackCookieRole === "admin" || fallbackCookieRole === "owner" || fallbackCookieRole === "member") {
      return fallbackCookieRole;
    }
  }

  return "public";
}

function hasRole(actual: AppRole, required: AppRole): boolean {
  return roleRank[actual] >= roleRank[required];
}

function forbidden(pathname: string, message: string): NextResponse {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const url = new URL("/", "http://localhost");
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let role = getRole(request);
  const isPublicOwnerApplicationRoute = pathname === "/owner" || pathname === "/api/owner-applications";

  const sessionToken = request.cookies.get(getSessionCookieName())?.value;
  if (sessionToken) {
    // A verified signed session should override the dev cookie because protected API routes use
    // this as the real auth path.
    const claims = await verifySessionToken(sessionToken);
    if (claims) {
      role = claims.role;
    }
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!hasRole(role, "admin")) {
      return forbidden(pathname, "admin_role_required");
    }
  }

  if (pathname.startsWith("/owner") || pathname.startsWith("/api/owner")) {
    if (isPublicOwnerApplicationRoute) {
      return NextResponse.next();
    }

    if (!hasRole(role, "owner")) {
      return forbidden(pathname, "owner_role_required");
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/api/admin/:path*", "/api/owner/:path*", "/api/owner-applications"],
};

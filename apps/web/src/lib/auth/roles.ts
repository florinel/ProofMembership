import { cookies, headers } from "next/headers";

import { getSessionCookieName, verifySessionToken } from "@/lib/auth/token";

export type AppRole = "public" | "member" | "owner" | "admin";

const roleRank: Record<AppRole, number> = {
  public: 0,
  member: 1,
  owner: 2,
  admin: 3,
};

function parseCookieRole(cookieHeader: string | null): AppRole | null {
  if (!cookieHeader) {
    return null;
  }

  const entries = cookieHeader.split(";").map((part) => part.trim());
  const roleEntry = entries.find((part) => part.startsWith("solnft_role="));
  if (!roleEntry) {
    return null;
  }

  const value = roleEntry.split("=")[1];
  if (value === "admin" || value === "owner" || value === "member") {
    return value;
  }

  return "public";
}

export async function getRequestRole(): Promise<AppRole> {
  const sessionClaims = await getSessionClaims();
  if (sessionClaims) {
    return sessionClaims.role;
  }

  if (process.env.NODE_ENV !== "production") {
    const headerStore = await headers();
    const cookieRole = parseCookieRole(headerStore.get("cookie"));
    if (cookieRole) {
      return cookieRole;
    }

    const headerRole = headerStore.get("x-solnft-role");
    if (headerRole === "admin" || headerRole === "owner" || headerRole === "member") {
      return headerRole;
    }
  }

  return "public";
}

export async function getSessionClaims(): Promise<{ wallet: string; role: AppRole } | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;

  if (sessionToken) {
    const claims = await verifySessionToken(sessionToken);
    if (claims) {
      return claims;
    }
  }

  return null;
}

export async function canAccess(requiredRole: AppRole): Promise<boolean> {
  const actualRole = await getRequestRole();
  return roleRank[actualRole] >= roleRank[requiredRole];
}

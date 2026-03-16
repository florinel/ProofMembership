import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, getSessionTtlSeconds, issueSessionToken } from "@/lib/auth/token";

type AppRole = "public" | "member" | "owner" | "admin";

function isRole(value: string): value is AppRole {
  return value === "public" || value === "member" || value === "owner" || value === "admin";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { role?: string };
  const role = body.role;

  if (!role || !isRole(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, role });

  const sessionToken = await issueSessionToken({
    wallet: "dev-wallet",
    role,
  });

  response.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: getSessionTtlSeconds(),
  });

  response.cookies.set("solnft_role", role, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}

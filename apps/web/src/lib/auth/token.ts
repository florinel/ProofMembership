import { SignJWT, jwtVerify } from "jose";

import type { AppRole } from "@/lib/auth/roles";

export type SessionClaims = {
  wallet: string;
  role: AppRole;
};

const SESSION_COOKIE_NAME = "proofmembership_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SESSION_ISSUER = "proofmembership";

function getSessionSecret(): Uint8Array {
  // Keep local auth usable out of the box, but production deploys should always provide an
  // explicit secret so sessions remain stable across restarts and environments.
  const fallback = "dev-only-secret-change-in-production";
  const secret = process.env.PROOFMEMBERSHIP_AUTH_SECRET ?? fallback;
  return new TextEncoder().encode(secret);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getSessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}

export async function issueSessionToken(claims: SessionClaims): Promise<string> {
  // Keep session payload minimal: only identity and resolved role.
  return new SignJWT({ wallet: claims.wallet, role: claims.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SESSION_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      issuer: SESSION_ISSUER,
    });

    const wallet = payload.wallet;
    const role = payload.role;

    if (typeof wallet !== "string") {
      return null;
    }

    // Reject unknown roles defensively so malformed or stale tokens degrade
    // to anonymous access instead of expanding privilege.
    if (role !== "public" && role !== "member" && role !== "owner" && role !== "admin") {
      return null;
    }

    return { wallet, role };
  } catch {
    return null;
  }
}

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";

import {
  getSessionCookieName,
  getSessionTtlSeconds,
  issueSessionToken,
  verifySessionToken,
} from "@/lib/auth/token";

describe("session token helpers", () => {
  const originalSecret = process.env.PROOFMEMBERSHIP_AUTH_SECRET;

  beforeEach(() => {
    process.env.PROOFMEMBERSHIP_AUTH_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.PROOFMEMBERSHIP_AUTH_SECRET = originalSecret;
  });

  it("returns stable session cookie metadata", () => {
    expect(getSessionCookieName()).toBe("proofmembership_session");
    expect(getSessionTtlSeconds()).toBe(60 * 60 * 8);
  });

  it("issues and verifies a valid session token", async () => {
    const token = await issueSessionToken({ wallet: "wallet-1", role: "owner" });

    await expect(verifySessionToken(token)).resolves.toEqual({
      wallet: "wallet-1",
      role: "owner",
    });
  });

  it("returns null for token with invalid role claim", async () => {
    const secret = new TextEncoder().encode("test-secret");
    const token = await new SignJWT({ wallet: "wallet-1", role: "superadmin" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("proofmembership")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("returns null for token missing wallet claim", async () => {
    const secret = new TextEncoder().encode("test-secret");
    const token = await new SignJWT({ role: "member" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("proofmembership")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("returns null when token signature is checked with a different secret", async () => {
    const token = await issueSessionToken({ wallet: "wallet-1", role: "member" });
    process.env.PROOFMEMBERSHIP_AUTH_SECRET = "other-secret";

    await expect(verifySessionToken(token)).resolves.toBeNull();
  });
});
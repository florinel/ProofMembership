import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearWalletSession,
  createWalletChallenge,
  setDevRole,
  verifyWalletSession,
} from "@/lib/auth/session";

function jsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

describe("auth session client helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("setDevRole posts role payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await setDevRole("owner");

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/dev-role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "owner" }),
    });
  });

  it("setDevRole throws on fetch failure response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "nope" }, false, 500));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(setDevRole("admin")).rejects.toThrowError("Failed to set role");
  });

  it("createWalletChallenge rejects malformed response payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ nonce: "n-1" }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(createWalletChallenge("wallet-1")).rejects.toThrowError("Failed to create wallet challenge");
  });

  it("createWalletChallenge rejects non-ok response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "bad" }, false, 400));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(createWalletChallenge("wallet-1")).rejects.toThrowError("Failed to create wallet challenge");
  });

  it("verifyWalletSession rejects non-ok response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "bad" }, false, 400));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      verifyWalletSession({
        wallet: "wallet-1",
        nonce: "nonce-1",
        message: "hello",
        signature: "sig-1",
      })
    ).rejects.toThrowError("Failed to verify wallet signature");
  });

  it("verifyWalletSession rejects missing wallet or role in response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ wallet: "wallet-1" }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      verifyWalletSession({
        wallet: "wallet-1",
        nonce: "nonce-1",
        message: "hello",
        signature: "sig-1",
      })
    ).rejects.toThrowError("Invalid verify response");
  });

  it("clearWalletSession posts logout request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await clearWalletSession();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });
});
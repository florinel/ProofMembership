import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  clearWalletSession: vi.fn(),
  createWalletChallenge: vi.fn(),
  verifyWalletSession: vi.fn(),
}));

import WalletConnectClient from "@/components/auth/WalletConnectClient";
import {
  clearWalletSession,
  createWalletChallenge,
  verifyWalletSession,
} from "@/lib/auth/session";

const clearWalletSessionMock = vi.mocked(clearWalletSession);
const createWalletChallengeMock = vi.mocked(createWalletChallenge);
const verifyWalletSessionMock = vi.mocked(verifyWalletSession);

function createProvider() {
  return {
    publicKey: { toBase58: () => "4Nd1mJrNnk7U2fTH8QW5Jf3EXAMPLe1111111111111111111" },
    connect: vi.fn().mockResolvedValue({
      publicKey: { toBase58: () => "4Nd1mJrNnk7U2fTH8QW5Jf3EXAMPLe1111111111111111111" },
    }),
    signMessage: vi.fn().mockResolvedValue({ signature: new Uint8Array([1, 2, 3, 4]) }),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
}

describe("WalletConnectClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error test provider injection
    window.solana = createProvider();
    createWalletChallengeMock.mockResolvedValue({
      nonce: "nonce-1",
      message: "Sign this message",
      expiresAtUnix: 123,
    });
    verifyWalletSessionMock.mockResolvedValue({
      wallet: "4Nd1mJrNnk7U2fTH8QW5Jf3EXAMPLe1111111111111111111",
      role: "owner",
    });
    clearWalletSessionMock.mockResolvedValue(undefined);
  });

  it("signs in through wallet challenge flow and shows resolved role", async () => {
    render(<WalletConnectClient />);

    fireEvent.click(screen.getByRole("button", { name: "Connect Wallet and Sign In" }));

    await waitFor(() => {
      expect(createWalletChallengeMock).toHaveBeenCalledWith("4Nd1mJrNnk7U2fTH8QW5Jf3EXAMPLe1111111111111111111");
      expect(verifyWalletSessionMock).toHaveBeenCalled();
      expect(screen.getByText("Resolved role: owner")).toBeInTheDocument();
      expect(screen.getByText("Signed in as owner. You can now test owner and storefront routes with this wallet session.")).toBeInTheDocument();
    });

    expect(screen.getByText(/Connected wallet:/)).toHaveTextContent("Connected wallet: 4Nd1mJrNnk7U2fTH8QW5Jf3EXAMPLe1111111111111111111");
    expect(screen.getByText(/Active wallet:/)).toHaveTextContent("Active wallet: 4Nd1...1111");
  });

  it("signs out and clears rendered session state", async () => {
    render(<WalletConnectClient />);

    fireEvent.click(screen.getByRole("button", { name: "Connect Wallet and Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Resolved role: owner")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

    await waitFor(() => {
      expect(clearWalletSessionMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Resolved role: (not signed in)")).toBeInTheDocument();
      expect(screen.getByText("No wallet connected yet.")).toBeInTheDocument();
      expect(screen.getByText("Signed out. Session cookie cleared.")).toBeInTheDocument();
    });
  });
});
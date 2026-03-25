import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StorefrontFlowClient from "@/components/storefront/StorefrontFlowClient";

function jsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

describe("StorefrontFlowClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test cleanup
    delete window.solana;
  });

  it("loads initial wallet into status and fetches campaigns and memberships", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/clubs") {
        return Promise.resolve(jsonResponse([{ id: "club-1" }]));
      }
      if (url === "/api/clubs/club-1/campaigns") {
        return Promise.resolve(jsonResponse([
          {
            id: "camp-1",
            clubId: "club-1",
            name: "Spring Pass",
            priceAtomic: "2",
            paymentToken: "SOL",
            templateImageUri: "https://example.com/template.png",
            mintMode: "on_purchase",
            mintStartsAtUnix: null,
            maxSupply: null,
            mintedSupply: 0,
            expiresAtUnix: null,
            status: "active",
          },
        ]));
      }
      if (url === "/api/memberships/wallet-1") {
        return Promise.resolve(jsonResponse([]));
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<StorefrontFlowClient initialWallet="wallet-1" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("wallet-1")).toBeInTheDocument();
      expect(screen.getByText("Buyer wallet loaded from connected wallet session.")).toBeInTheDocument();
      expect(screen.getByText("Spring Pass")).toBeInTheDocument();
    });
  });

  it("completes local purchase flow and refreshes memberships", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/clubs") {
        return Promise.resolve(jsonResponse([{ id: "club-1" }]));
      }
      if (url === "/api/clubs/club-1/campaigns") {
        return Promise.resolve(jsonResponse([
          {
            id: "camp-1",
            clubId: "club-1",
            name: "Spring Pass",
            priceAtomic: "2",
            paymentToken: "SOL",
            templateImageUri: "https://example.com/template.png",
            mintMode: "on_purchase",
            mintStartsAtUnix: null,
            maxSupply: null,
            mintedSupply: 0,
            expiresAtUnix: null,
            status: "active",
          },
        ]));
      }
      if (url === "/api/memberships/buyer-1") {
        const afterPurchase = fetchMock.mock.calls.some(([, request]) => String((request as RequestInit | undefined)?.body ?? "").includes("camp-1"));
        return Promise.resolve(jsonResponse(afterPurchase ? [{
          id: "m-1",
          assetId: "asset-1",
          metadataUri: "/api/metadata/asset-1",
          campaignId: "camp-1",
          nftMint: "mint-1",
          expiresAtUnix: null,
        }] : []));
      }
      if (url === "/api/storefront/purchase" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({
          membership: { id: "m-1" },
        }, true, 201));
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<StorefrontFlowClient initialWallet="buyer-1" />);

    await waitFor(() => {
      expect(screen.getByText("Spring Pass")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Buy membership" }));

    await waitFor(() => {
      expect(screen.getByText("Membership purchased: m-1")).toBeInTheDocument();
      expect(screen.getByText("mint-1")).toBeInTheDocument();
    });
  });

  it("surfaces onchain wallet-provider failure without requiring blockchain interaction", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/clubs") {
        return Promise.resolve(jsonResponse([{ id: "club-1" }]));
      }
      if (url === "/api/clubs/club-1/campaigns") {
        return Promise.resolve(jsonResponse([
          {
            id: "camp-1",
            clubId: "club-1",
            name: "Spring Pass",
            priceAtomic: "2",
            paymentToken: "SOL",
            templateImageUri: "https://example.com/template.png",
            mintMode: "on_purchase",
            mintStartsAtUnix: null,
            maxSupply: null,
            mintedSupply: 0,
            expiresAtUnix: null,
            status: "active",
          },
        ]));
      }
      if (url === "/api/memberships/buyer-1") {
        return Promise.resolve(jsonResponse([]));
      }
      if (url === "/api/storefront/purchase" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({
          purchaseIntent: {
            kind: "onchain_purchase_intent",
            executionMode: "anchor_purchase_membership",
            campaignId: "camp-1",
            campaignOnchainAddress: "campaign-address",
            clubOnchainAddress: "club-address",
            buyerWallet: "buyer-1",
            ownerTreasury: "owner-treasury",
            quotedAmountSol: "2.000000",
            quotedAmountLamports: 2_000_000_000,
            rpcUrl: "http://127.0.0.1:8899",
            programId: "11111111111111111111111111111111",
            platformConfigPda: "platform-pda",
            platformTreasury: "platform-treasury",
            suggestedCommitment: "confirmed",
          },
        }, true, 202));
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<StorefrontFlowClient initialWallet="buyer-1" />);

    await waitFor(() => {
      expect(screen.getByText("Spring Pass")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Buy membership" }));

    await waitFor(() => {
      expect(screen.getByText("On-chain submission failed: wallet_provider_not_found")).toBeInTheDocument();
    });
  });
});
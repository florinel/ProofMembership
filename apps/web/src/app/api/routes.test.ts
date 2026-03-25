import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const originalPurchaseMode = process.env.PROOFMEMBERSHIP_PURCHASE_MODE;

vi.mock("@/lib/data/store", () => ({
  createCampaign: vi.fn(),
  purchaseMembership: vi.fn(),
}));

vi.mock("@/lib/chain/purchase", () => ({
  purchaseMembershipOnchain: vi.fn(),
}));

import { createCampaign, purchaseMembership } from "@/lib/data/store";
import { purchaseMembershipOnchain } from "@/lib/chain/purchase";
import { POST as postOwnerCampaign } from "@/app/api/owner/campaigns/route";
import { POST as postStorefrontPurchase } from "@/app/api/storefront/purchase/route";

const createCampaignMock = vi.mocked(createCampaign);
const purchaseMembershipMock = vi.mocked(purchaseMembership);
const purchaseMembershipOnchainMock = vi.mocked(purchaseMembershipOnchain);

describe("API route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PROOFMEMBERSHIP_PURCHASE_MODE = "local";
  });

  it("owner campaign route rejects owner-supplied campaign fee bps", async () => {
    const request = new NextRequest("http://localhost/api/owner/campaigns", {
      method: "POST",
      body: JSON.stringify({ campaignFeeBps: 999 }),
      headers: { "content-type": "application/json" },
    });

    const response = await postOwnerCampaign(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "owner_cannot_set_campaign_fee_bps" });
    expect(createCampaignMock).not.toHaveBeenCalled();
  });

  it("owner campaign route returns created campaign payload", async () => {
    createCampaignMock.mockReturnValue({
      id: "camp-1",
      clubId: "club-1",
      name: "VIP Access",
      priceAtomic: "2",
      paymentToken: "SOL",
      templateImageUri: "https://example.com/template.png",
      mintMode: "on_purchase",
      mintStartsAtUnix: null,
      maxSupply: null,
      mintedSupply: 0,
      expiresAtUnix: null,
      status: "active",
      onchainAddress: undefined,
    });

    const request = new NextRequest("http://localhost/api/owner/campaigns", {
      method: "POST",
      body: JSON.stringify({
        clubId: " club-1 ",
        ownerWallet: " owner-wallet ",
        name: " VIP Access ",
        priceAtomic: " 2 ",
        templateImageUri: " https://example.com/template.png ",
        mintMode: "on_purchase",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await postOwnerCampaign(request);
    expect(response.status).toBe(201);
    expect(createCampaignMock).toHaveBeenCalledWith({
      clubId: "club-1",
      ownerWallet: "owner-wallet",
      name: "VIP Access",
      priceAtomic: "2",
      templateImageUri: "https://example.com/template.png",
      mintMode: "on_purchase",
      mintStartsAtUnix: null,
      maxSupply: null,
      expiresAtUnix: null,
    });
    await expect(response.json()).resolves.toMatchObject({ ok: true, campaign: { id: "camp-1" } });
  });

  it("storefront purchase route returns local purchase result by default", async () => {
    purchaseMembershipMock.mockReturnValue({
      membership: { id: "m-1" },
      asset: { assetId: "a-1" },
      paidAmount: 2,
      platformFeeAtomic: "0.100000",
      ownerReceivesAtomic: "1.900000",
    } as never);

    const request = new NextRequest("http://localhost/api/storefront/purchase", {
      method: "POST",
      body: JSON.stringify({ campaignId: "camp-1", buyerWallet: "buyer-1" }),
      headers: { "content-type": "application/json" },
    });

    const response = await postStorefrontPurchase(request);
    expect(response.status).toBe(201);
    expect(purchaseMembershipMock).toHaveBeenCalledWith({ campaignId: "camp-1", buyerWallet: "buyer-1" });
    await expect(response.json()).resolves.toMatchObject({ ok: true, mode: "local" });
  });

  it("storefront purchase route returns onchain purchase intent when mode is onchain", async () => {
    process.env.PROOFMEMBERSHIP_PURCHASE_MODE = "onchain";
    purchaseMembershipOnchainMock.mockResolvedValue({
      purchaseIntent: {
        kind: "onchain_purchase_intent",
        executionMode: "anchor_purchase_membership",
        campaignId: "camp-1",
        campaignOnchainAddress: "campaign-address",
        clubOnchainAddress: "club-address",
        buyerWallet: "buyer-1",
        ownerTreasury: "owner-treasury",
        quotedAmountSol: "1.000000",
        quotedAmountLamports: 1_000_000_000,
        rpcUrl: "http://localhost:8899",
        programId: "program-id",
        platformConfigPda: "platform-pda",
        platformTreasury: "platform-treasury",
        suggestedCommitment: "confirmed",
      },
    });

    const request = new NextRequest("http://localhost/api/storefront/purchase", {
      method: "POST",
      body: JSON.stringify({ campaignId: "camp-1", buyerWallet: "buyer-1" }),
      headers: { "content-type": "application/json" },
    });

    const response = await postStorefrontPurchase(request);
    expect(response.status).toBe(202);
    expect(purchaseMembershipOnchainMock).toHaveBeenCalledWith({ campaignId: "camp-1", buyerWallet: "buyer-1" });
    await expect(response.json()).resolves.toMatchObject({ ok: true, mode: "onchain" });
  });
});

afterAll(() => {
  process.env.PROOFMEMBERSHIP_PURCHASE_MODE = originalPurchaseMode;
});
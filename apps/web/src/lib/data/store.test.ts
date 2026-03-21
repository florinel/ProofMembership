import { describe, expect, it, beforeEach } from "vitest";

import {
  __resetStoreForTests,
  createCampaign,
  createClub,
  getAdminOverview,
  initializePlatform,
  listCampaignsByClub,
  listMembershipsByWallet,
  purchaseMembership,
} from "@/lib/data/store";

describe("store lifecycle", () => {
  beforeEach(() => {
    __resetStoreForTests();
  });

  it("initializes platform config", () => {
    const config = initializePlatform({
      clubCreationFee: 2,
      campaignCreationFee: 0.7,
      defaultCampaignFeeBps: 800,
      defaultMinCampaignFeeAtomic: "0.0003",
    });

    expect(config.initialized).toBe(true);
    expect(config.clubCreationFee).toBe(2);
    expect(config.campaignCreationFee).toBe(0.7);
    expect(config.defaultCampaignFeeBps).toBe(800);
  });

  it("creates a club after sufficient fee", () => {
    initializePlatform({
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
    });

    const club = createClub({
      slug: "new-club",
      ownerWallet: "owner-wallet-1",
      metadataUri: "https://example.com/new-club.json",
      feePaid: 1,
    });

    const overview = getAdminOverview();
    expect(club.slug).toBe("new-club");
    expect(overview.clubs).toBe(1);
  });

  it("auto-collects admin-defined campaign creation fee", () => {
    initializePlatform({
      clubCreationFee: 1,
      campaignCreationFee: 5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
    });

    const club = createClub({
      slug: "fee-test",
      ownerWallet: "owner-wallet-2",
      metadataUri: "https://example.com/fee-test.json",
      feePaid: 1,
    });

    const campaign = createCampaign({
      clubId: club.id,
      ownerWallet: "owner-wallet-2",
      name: "Fee Collected Campaign",
      priceAtomic: "10",
      templateImageUri: "https://example.com/template.png",
      mintMode: "on_purchase",
      mintStartsAtUnix: null,
      maxSupply: null,
      expiresAtUnix: null,
    });

    const overview = getAdminOverview();
    expect(campaign.id.length).toBeGreaterThan(0);
    expect(overview.platformBalanceAtomic).toBe("6.00");
  });

  it("supports full create campaign and purchase flow", () => {
    initializePlatform({
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
    });

    const club = createClub({
      slug: "flow-club",
      ownerWallet: "owner-wallet-3",
      metadataUri: "https://example.com/flow-club.json",
      feePaid: 1,
    });

    const campaign = createCampaign({
      clubId: club.id,
      ownerWallet: "owner-wallet-3",
      name: "Flow Campaign",
      priceAtomic: "2.5",
      templateImageUri: "https://example.com/template-flow.png",
      mintMode: "live_event",
      mintStartsAtUnix: Math.floor(Date.now() / 1000) - 60,
      maxSupply: 10,
      expiresAtUnix: null,
    });

    const purchase = purchaseMembership({
      campaignId: campaign.id,
      buyerWallet: "buyer-wallet-1",
    });

    const campaigns = listCampaignsByClub(club.id);
    const memberships = listMembershipsByWallet("buyer-wallet-1");

    expect(purchase.paidAmount).toBe(2.5);
    expect(campaigns.find((entry) => entry.id === campaign.id)?.mintedSupply).toBe(1);
    expect(memberships.length).toBe(1);
  });

  it("rejects campaign creation without template image", () => {
    initializePlatform({
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
    });

    const club = createClub({
      slug: "template-required",
      ownerWallet: "owner-wallet-template",
      metadataUri: "https://example.com/template-required.json",
      feePaid: 1,
    });

    expect(() =>
      createCampaign({
        clubId: club.id,
        ownerWallet: "owner-wallet-template",
        name: "No Template Campaign",
        priceAtomic: "1.2",
        templateImageUri: "",
        mintMode: "on_purchase",
        mintStartsAtUnix: null,
        maxSupply: null,
        expiresAtUnix: null,
      })
    ).toThrowError("template_image_required");
  });

  it("blocks live mint purchase before start timestamp", () => {
    initializePlatform({
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
    });

    const club = createClub({
      slug: "future-live",
      ownerWallet: "owner-wallet-live",
      metadataUri: "https://example.com/future-live.json",
      feePaid: 1,
    });

    const liveCampaign = createCampaign({
      clubId: club.id,
      ownerWallet: "owner-wallet-live",
      name: "Future Live Mint",
      priceAtomic: "3",
      templateImageUri: "https://example.com/live-template.png",
      mintMode: "live_event",
      mintStartsAtUnix: Math.floor(Date.now() / 1000) + 3600,
      maxSupply: null,
      expiresAtUnix: null,
    });

    expect(() =>
      purchaseMembership({
        campaignId: liveCampaign.id,
        buyerWallet: "buyer-wallet-live",
      })
    ).toThrowError("mint_not_started");
  });
});

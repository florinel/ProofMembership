import { describe, expect, it, beforeEach } from "vitest";

import {
  __resetStoreForTests,
  approveOwnerApplication,
  createCampaign,
  createClub,
  getAdminOverview,
  initializePlatform,
  listCampaignsByClub,
  listMembershipsByWallet,
  projectOnchainMembershipPurchase,
  purchaseMembership,
  rejectOwnerApplication,
  setClubFeePolicy,
  setCampaignOnchainAddress,
  submitOwnerApplication,
} from "@/lib/data/store";

function approveOwner(wallet: string): void {
  const application = submitOwnerApplication({
    wallet,
    description: "Sports club owner application",
  });

  approveOwnerApplication({
    applicationId: application.id,
  });
}

describe("store lifecycle", () => {
  beforeEach(() => {
    __resetStoreForTests();
  });

  it("initializes platform config", () => {

    const config = initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 2,
      campaignCreationFee: 0.7,
      defaultCampaignFeeBps: 800,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    expect(config.initialized).toBe(true);
    expect(config.ownerApprovalFee).toBe(0.5);
    expect(config.clubCreationFee).toBe(2);
    expect(config.campaignCreationFee).toBe(0.7);
    expect(config.defaultCampaignFeeBps).toBe(800);
  });

  it("creates a club after sufficient fee", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-1");

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
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-2");

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
    expect(overview.platformBalanceAtomic).toBe("6.500000");
  });

  it("supports full create campaign and purchase flow", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-3");

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
    expect(purchase.asset.provenance).toBe("synthetic_local");
    expect(purchase.asset.mintAddress).toBe(purchase.membership.nftMint);
    expect(campaigns.find((entry) => entry.id === campaign.id)?.mintedSupply).toBe(1);
    expect(memberships.length).toBe(1);
  });

  it("sets campaign onchain address mapping", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-onchain-map");

    const club = createClub({
      slug: "map-club",
      ownerWallet: "owner-wallet-onchain-map",
      metadataUri: "https://example.com/map-club.json",
      feePaid: 1,
    });

    const campaign = createCampaign({
      clubId: club.id,
      ownerWallet: "owner-wallet-onchain-map",
      name: "Mapped Campaign",
      priceAtomic: "2",
      templateImageUri: "https://example.com/map-template.png",
      mintMode: "on_purchase",
      mintStartsAtUnix: null,
      maxSupply: null,
      expiresAtUnix: null,
    });

    const mapped = setCampaignOnchainAddress({
      campaignId: campaign.id,
      onchainAddress: "6Q8Yg3vBf2iM7mWqL4nXbYd9pQk2tRj6hJ4sN8zP1cVa",
    });

    expect(mapped.onchainAddress).toBe("6Q8Yg3vBf2iM7mWqL4nXbYd9pQk2tRj6hJ4sN8zP1cVa");
  });

  it("rejects campaign creation without template image", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-template");

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

  it("allows admin rejection of owner application without charging approval fee", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    const application = submitOwnerApplication({
      wallet: "owner-wallet-reject",
      description: "Application missing ownership docs",
    });

    const rejected = rejectOwnerApplication({
      applicationId: application.id,
      reviewNote: "Please include supporting documents.",
    });

    const overview = getAdminOverview();

    expect(rejected.status).toBe("rejected");
    expect(rejected.settlementStatus).toBe("returned_to_applicant");
    expect(rejected.settlementAmountAtomic).toBe("0.500000");
    expect(rejected.reviewNote).toContain("supporting documents");
    expect(overview.pendingOwnerApplications).toBe(0);
    expect(overview.platformBalanceAtomic).toBe("0.000000");
  });

  it("applies deterministic settlement metadata on approval", () => {
    initializePlatform({
      ownerApprovalFee: 0.75,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    const application = submitOwnerApplication({
      wallet: "owner-wallet-settlement",
      description: "Owner application",
    });

    const approved = approveOwnerApplication({
      applicationId: application.id,
    });

    expect(approved.status).toBe("approved");
    expect(approved.settlementStatus).toBe("settled_to_admin");
    expect(approved.settlementAmountAtomic).toBe("0.750000");
  });

  it("blocks live mint purchase before start timestamp", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-live");

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

  it("projects confirmed onchain purchase into membership read model", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-proj");

    const club = createClub({
      slug: "onchain-proj",
      ownerWallet: "owner-wallet-proj",
      metadataUri: "https://example.com/onchain-proj.json",
      feePaid: 1,
    });

    const campaign = createCampaign({
      clubId: club.id,
      ownerWallet: "owner-wallet-proj",
      name: "Onchain Projection Campaign",
      priceAtomic: "1.75",
      templateImageUri: "https://example.com/onchain-template.png",
      mintMode: "on_purchase",
      mintStartsAtUnix: null,
      maxSupply: null,
      expiresAtUnix: null,
    });

    const projection = projectOnchainMembershipPurchase({
      campaignId: campaign.id,
      buyerWallet: "buyer-wallet-proj",
      txSignature: "2cM7p8xS5xvJ9w1bA4mKpQ8rY2tN6dL3uV1hF7zR9qEw",
    });

    const memberships = listMembershipsByWallet("buyer-wallet-proj");
    expect(projection.paidAmount).toBe(1.75);
    expect(projection.membership.mintTxSignature).toBe("2cM7p8xS5xvJ9w1bA4mKpQ8rY2tN6dL3uV1hF7zR9qEw");
    expect(projection.asset.provenance).toBe("onchain");
    expect(memberships.length).toBe(1);
  });

  it("rejects duplicate tx signature projection", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-dupe");

    const club = createClub({
      slug: "onchain-dupe",
      ownerWallet: "owner-wallet-dupe",
      metadataUri: "https://example.com/onchain-dupe.json",
      feePaid: 1,
    });

    const campaign = createCampaign({
      clubId: club.id,
      ownerWallet: "owner-wallet-dupe",
      name: "Onchain Duplicate Campaign",
      priceAtomic: "2.00",
      templateImageUri: "https://example.com/onchain-dupe-template.png",
      mintMode: "on_purchase",
      mintStartsAtUnix: null,
      maxSupply: null,
      expiresAtUnix: null,
    });

    projectOnchainMembershipPurchase({
      campaignId: campaign.id,
      buyerWallet: "buyer-wallet-dupe",
      txSignature: "4Y2u9pWq6xB1kL8mR3tN7dC5vH2sE9fJ1aP6qZ3xT8n",
    });

    expect(() =>
      projectOnchainMembershipPurchase({
        campaignId: campaign.id,
        buyerWallet: "buyer-wallet-dupe",
        txSignature: "4Y2u9pWq6xB1kL8mR3tN7dC5vH2sE9fJ1aP6qZ3xT8n",
      })
    ).toThrowError("tx_signature_already_projected");
  });

  it("rejects purchase after max supply is reached", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-sold-out");

    const club = createClub({
      slug: "sold-out-club",
      ownerWallet: "owner-wallet-sold-out",
      metadataUri: "https://example.com/sold-out.json",
      feePaid: 1,
    });

    const campaign = createCampaign({
      clubId: club.id,
      ownerWallet: "owner-wallet-sold-out",
      name: "Sold Out Campaign",
      priceAtomic: "1.1",
      templateImageUri: "https://example.com/sold-out-template.png",
      mintMode: "on_purchase",
      mintStartsAtUnix: null,
      maxSupply: 1,
      expiresAtUnix: null,
    });

    purchaseMembership({
      campaignId: campaign.id,
      buyerWallet: "buyer-wallet-sold-out-1",
    });

    expect(() =>
      purchaseMembership({
        campaignId: campaign.id,
        buyerWallet: "buyer-wallet-sold-out-2",
      })
    ).toThrowError("campaign_sold_out");
  });

  it("rejects purchase for expired campaign", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-expired");

    const club = createClub({
      slug: "expired-club",
      ownerWallet: "owner-wallet-expired",
      metadataUri: "https://example.com/expired.json",
      feePaid: 1,
    });

    const campaign = createCampaign({
      clubId: club.id,
      ownerWallet: "owner-wallet-expired",
      name: "Expired Campaign",
      priceAtomic: "2.1",
      templateImageUri: "https://example.com/expired-template.png",
      mintMode: "on_purchase",
      mintStartsAtUnix: null,
      maxSupply: null,
      expiresAtUnix: Math.floor(Date.now() / 1000) - 60,
    });

    expect(() =>
      purchaseMembership({
        campaignId: campaign.id,
        buyerWallet: "buyer-wallet-expired",
      })
    ).toThrowError("campaign_expired");
  });

  it("applies updated club fee policy to purchase split", () => {
    initializePlatform({
      ownerApprovalFee: 0.5,
      clubCreationFee: 1,
      campaignCreationFee: 0.5,
      defaultCampaignFeeBps: 500,
      defaultMinCampaignFeeAtomic: "0.0003",
      perMemberFee: 0.1,
      perMemberFeeCap: 0.5,
      perMemberFeeDiscountThreshold: 10,
      perMemberFeeDiscount: 0.05,
    });

    approveOwner("owner-wallet-fee-policy");

    const club = createClub({
      slug: "fee-policy-club",
      ownerWallet: "owner-wallet-fee-policy",
      metadataUri: "https://example.com/fee-policy-club.json",
      feePaid: 1,
    });

    setClubFeePolicy({
      clubId: club.id,
      campaignFeeBps: 0,
      minCampaignFeeAtomic: "8.5", // Ensure string value
    });

    const campaign = createCampaign({
      clubId: club.id,
      ownerWallet: "owner-wallet-fee-policy",
      name: "Fee Policy Campaign",
      priceAtomic: "10",
      templateImageUri: "https://example.com/fee-policy-template.png",
      mintMode: "on_purchase",
      mintStartsAtUnix: null,
      maxSupply: null,
      expiresAtUnix: null,
    });

    const purchase = purchaseMembership({
      campaignId: campaign.id,
      buyerWallet: "buyer-wallet-fee-policy",
    });

    expect(purchase.platformFeeAtomic).toBe("8.500000");
  });
});

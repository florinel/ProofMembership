import type { Campaign, Club, Membership } from "@solnft/types";

export const clubs: Club[] = [
  {
    id: "club-golden-greens",
    slug: "golden-greens",
    ownerWallet: "9rmx...7h2Q",
    metadataUri: "https://example.com/clubs/golden-greens.json",
  },
  {
    id: "club-river-vip",
    slug: "river-vip",
    ownerWallet: "F3cD...19Qm",
    metadataUri: "https://example.com/clubs/river-vip.json",
  },
];

export const campaigns: Campaign[] = [
  {
    id: "camp-greens-main",
    clubId: "club-golden-greens",
    name: "Daily Membership",
    priceAtomic: "1.5",
    paymentToken: "SOL",
    templateImageUri: "https://example.com/media/greens-main.png",
    mintMode: "on_purchase",
    mintStartsAtUnix: null,
    maxSupply: null,
    mintedSupply: 124,
    expiresAtUnix: null,
    status: "active",
  },
  {
    id: "camp-greens-vip-2026",
    clubId: "club-golden-greens",
    name: "VIP 2026 Access",
    priceAtomic: "120",
    paymentToken: "USDC",
    templateImageUri: "https://example.com/media/greens-vip.png",
    mintMode: "live_event",
    mintStartsAtUnix: 1767225600,
    maxSupply: 300,
    mintedSupply: 72,
    expiresAtUnix: 1798675200,
    status: "active",
  },
  {
    id: "camp-river-founding",
    clubId: "club-river-vip",
    name: "Founding Member",
    priceAtomic: "2.25",
    paymentToken: "SOL",
    templateImageUri: "https://example.com/media/river-founding.png",
    mintMode: "on_purchase",
    mintStartsAtUnix: null,
    maxSupply: 150,
    mintedSupply: 150,
    expiresAtUnix: null,
    status: "closed",
  },
];

export const memberships: Membership[] = [
  {
    id: "mship-001",
    campaignId: "camp-greens-main",
    ownerWallet: "6ja2...B9rT",
    nftMint: "Mint111...",
    purchasedAtUnix: 1741795200,
    expiresAtUnix: null,
    revoked: false,
  },
  {
    id: "mship-002",
    campaignId: "camp-greens-vip-2026",
    ownerWallet: "6ja2...B9rT",
    nftMint: "Mint222...",
    purchasedAtUnix: 1744300800,
    expiresAtUnix: 1798675200,
    revoked: false,
  },
];

export const adminOverview = {
  owners: 2,
  clubs: clubs.length,
  campaigns: campaigns.length,
  activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
  incomingDepositsAtomic: "583.74",
  platformBalanceAtomic: "184.12",
};

export function getClubCampaigns(clubId: string): Campaign[] {
  return campaigns.filter((campaign) => campaign.clubId === clubId);
}

export function getClubById(clubId: string): Club | null {
  return clubs.find((club) => club.id === clubId) ?? null;
}

export function getOwnerCampaigns(ownerWallet: string): Campaign[] {
  const ownedClubIds = clubs
    .filter((club) => club.ownerWallet.toLowerCase() === ownerWallet.toLowerCase())
    .map((club) => club.id);

  return campaigns.filter((campaign) => ownedClubIds.includes(campaign.clubId));
}

export function getWalletMemberships(wallet: string): Membership[] {
  return memberships.filter((membership) => membership.ownerWallet.toLowerCase() === wallet.toLowerCase());
}

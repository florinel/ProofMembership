import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

import type {
  Campaign,
  Club,
  Membership,
  MintMode,
  MembershipNftMetadata,
  MintedMembershipAsset,
  PaymentToken,
} from "@solnft/types";

type PlatformConfig = {
  initialized: boolean;
  clubCreationFee: number;
  campaignCreationFee: number;
  campaignFeeBps: number;
};

type PlatformLedger = {
  incomingDeposits: number;
  platformBalance: number;
};

type PlatformState = {
  config: PlatformConfig;
  ledger: PlatformLedger;
  clubs: Club[];
  campaigns: Campaign[];
  memberships: Membership[];
  assets: MintedMembershipAsset[];
};

type IndexerEvent = {
  id: string;
  type: string;
  createdAtUnix: number;
  payload: Record<string, unknown>;
};

type PurchaseResult = {
  membership: Membership;
  asset: MintedMembershipAsset;
  paidAmount: number;
};

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "pnpm-workspace.yaml"))) {
    return cwd;
  }

  const twoUp = path.resolve(cwd, "..", "..");
  if (fs.existsSync(path.join(twoUp, "pnpm-workspace.yaml"))) {
    return twoUp;
  }

  return cwd;
}

const DATA_DIR = path.join(resolveRepoRoot(), ".solnft", "indexer");
const MODEL_FILE = path.join(DATA_DIR, "read-model.json");
const EVENT_FILE = path.join(DATA_DIR, "events.json");

const initialState: PlatformState = {
  config: {
    initialized: false,
    clubCreationFee: 1,
    campaignCreationFee: 0.5,
    campaignFeeBps: 500,
  },
  ledger: {
    incomingDeposits: 0,
    platformBalance: 0,
  },
  clubs: [],
  campaigns: [],
  memberships: [],
  assets: [],
};

function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(MODEL_FILE)) {
    fs.writeFileSync(MODEL_FILE, JSON.stringify(initialState, null, 2), "utf8");
  }

  if (!fs.existsSync(EVENT_FILE)) {
    fs.writeFileSync(EVENT_FILE, "[]", "utf8");
  }
}

function readStore(): PlatformState {
  ensureStorage();
  const text = fs.readFileSync(MODEL_FILE, "utf8");
  const parsed = JSON.parse(text) as PlatformState;
  if (!Array.isArray(parsed.assets)) {
    parsed.assets = [];
  }
  return parsed;
}

function writeStore(state: PlatformState): void {
  ensureStorage();
  fs.writeFileSync(MODEL_FILE, JSON.stringify(state, null, 2), "utf8");
}

function appendEvent(type: string, payload: Record<string, unknown>): void {
  ensureStorage();
  // Keep a lightweight append-only log alongside the read model so local flows can be audited
  // without reconstructing state diffs from the JSON snapshot.
  const event: IndexerEvent = {
    id: createId("evt"),
    type,
    createdAtUnix: nowUnix(),
    payload,
  };

  const text = fs.readFileSync(EVENT_FILE, "utf8");
  const events = JSON.parse(text) as IndexerEvent[];
  events.push(event);
  fs.writeFileSync(EVENT_FILE, JSON.stringify(events, null, 2), "utf8");
}

export function __resetStoreForTests(): void {
  ensureStorage();
  fs.writeFileSync(MODEL_FILE, JSON.stringify(initialState, null, 2), "utf8");
  fs.writeFileSync(EVENT_FILE, "[]", "utf8");
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString("hex")}`;
}

function parseAmount(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
}

function parseMintMode(value: string): MintMode | null {
  if (value === "on_purchase" || value === "live_event") {
    return value;
  }
  return null;
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function buildMembershipMetadata(input: {
  club: Club;
  campaign: Campaign;
  membership: Membership;
}): MembershipNftMetadata {
  const expiresAtValue = input.membership.expiresAtUnix ?? "none";
  return {
    name: `${input.club.slug} ${input.campaign.name} Membership`,
    symbol: "SOLNFT",
    description: `Membership access NFT for ${input.club.slug} / ${input.campaign.name}.`,
    image: input.campaign.templateImageUri,
    external_url: "https://solnft.app/storefront",
    attributes: [
      { trait_type: "club_slug", value: input.club.slug },
      { trait_type: "campaign_name", value: input.campaign.name },
      { trait_type: "payment_token", value: input.campaign.paymentToken },
      { trait_type: "mint_mode", value: input.campaign.mintMode },
      { trait_type: "owner_wallet", value: input.membership.ownerWallet },
      { trait_type: "expires_at_unix", value: expiresAtValue },
      { trait_type: "revoked", value: input.membership.revoked },
    ],
    properties: {
      category: "image",
      files: [{ uri: input.campaign.templateImageUri, type: "image/png" }],
    },
  };
}

function mintMembershipAsset(input: {
  club: Club;
  campaign: Campaign;
  membership: Membership;
}): MintedMembershipAsset {
  // The current web stack records a synthetic asset immediately so storefront and metadata routes
  // already match the shape expected from a future on-chain mint/indexer pipeline.
  const metadata = buildMembershipMetadata(input);
  const assetId = createId("asset");
  return {
    assetId,
    membershipId: input.membership.id,
    standard: "cnft",
    compression: "bubblegum",
    metadataUri: `/api/metadata/${assetId}`,
    metadata,
    mintedAtUnix: nowUnix(),
  };
}

export function initializePlatform(config: {
  clubCreationFee: number;
  campaignCreationFee: number;
  campaignFeeBps: number;
}): PlatformConfig {
  const state = readStore();
  state.config = {
    initialized: true,
    clubCreationFee: config.clubCreationFee,
    campaignCreationFee: config.campaignCreationFee,
    campaignFeeBps: config.campaignFeeBps,
  };
  writeStore(state);
  appendEvent("platform_initialized", {
    clubCreationFee: config.clubCreationFee,
    campaignCreationFee: config.campaignCreationFee,
    campaignFeeBps: config.campaignFeeBps,
  });
  return state.config;
}

export function getAdminOverview() {
  const state = readStore();
  return {
    owners: new Set(state.clubs.map((club) => club.ownerWallet)).size,
    clubs: state.clubs.length,
    campaigns: state.campaigns.length,
    activeCampaigns: state.campaigns.filter((campaign) => campaign.status === "active").length,
    incomingDepositsAtomic: state.ledger.incomingDeposits.toFixed(2),
    platformBalanceAtomic: state.ledger.platformBalance.toFixed(2),
    config: state.config,
  };
}

export function listClubs(): Club[] {
  return readStore().clubs;
}

export function findClub(clubId: string): Club | null {
  return readStore().clubs.find((club) => club.id === clubId) ?? null;
}

export function listCampaignsByClub(clubId: string): Campaign[] {
  return readStore().campaigns.filter((campaign) => campaign.clubId === clubId);
}

export function listMembershipsByWallet(wallet: string): Membership[] {
  return readStore().memberships.filter((membership) => membership.ownerWallet.toLowerCase() === wallet.toLowerCase());
}

export function findAssetById(assetId: string): MintedMembershipAsset | null {
  return readStore().assets.find((asset) => asset.assetId === assetId) ?? null;
}

export function createClub(input: {
  slug: string;
  ownerWallet: string;
  metadataUri: string;
  feePaid: number;
}): Club {
  const state = readStore();
  if (!state.config.initialized) {
    throw new Error("platform_not_initialized");
  }
  if (input.feePaid < state.config.clubCreationFee) {
    throw new Error("insufficient_club_fee");
  }
  if (state.clubs.some((club) => club.slug.toLowerCase() === input.slug.toLowerCase())) {
    throw new Error("slug_already_exists");
  }

  const club: Club = {
    id: createId("club"),
    slug: input.slug,
    ownerWallet: input.ownerWallet,
    metadataUri: input.metadataUri,
  };

  state.clubs.push(club);
  state.ledger.incomingDeposits += input.feePaid;
  state.ledger.platformBalance += input.feePaid;
  writeStore(state);
  appendEvent("club_created", {
    clubId: club.id,
    slug: club.slug,
    ownerWallet: club.ownerWallet,
    metadataUri: club.metadataUri,
    feePaid: input.feePaid,
  });
  return club;
}

export function createCampaign(input: {
  clubId: string;
  ownerWallet: string;
  name: string;
  priceAtomic: string;
  paymentToken: PaymentToken;
  templateImageUri: string;
  mintMode: MintMode;
  mintStartsAtUnix: number | null;
  maxSupply: number | null;
  expiresAtUnix: number | null;
}): Campaign {
  const state = readStore();
  const club = state.clubs.find((entry) => entry.id === input.clubId);

  if (!state.config.initialized) {
    throw new Error("platform_not_initialized");
  }
  if (!club) {
    throw new Error("club_not_found");
  }
  if (club.ownerWallet.toLowerCase() !== input.ownerWallet.toLowerCase()) {
    throw new Error(`owner_mismatch:expected=${club.ownerWallet}:provided=${input.ownerWallet}`);
  }
  if (!input.templateImageUri.trim()) {
    throw new Error("template_image_required");
  }

  const mintMode = parseMintMode(input.mintMode);
  if (!mintMode) {
    throw new Error("invalid_mint_mode");
  }

  const price = parseAmount(input.priceAtomic);
  if (!price) {
    throw new Error("invalid_price");
  }

  const campaign: Campaign = {
    id: createId("camp"),
    clubId: input.clubId,
    name: input.name,
    priceAtomic: input.priceAtomic,
    paymentToken: input.paymentToken,
    templateImageUri: input.templateImageUri,
    mintMode,
    mintStartsAtUnix: input.mintStartsAtUnix,
    maxSupply: input.maxSupply,
    mintedSupply: 0,
    expiresAtUnix: input.expiresAtUnix,
    status: "active",
  };

  state.campaigns.push(campaign);
  state.ledger.incomingDeposits += state.config.campaignCreationFee;
  state.ledger.platformBalance += state.config.campaignCreationFee;
  writeStore(state);
  appendEvent("campaign_created", {
    campaignId: campaign.id,
    clubId: campaign.clubId,
    ownerWallet: input.ownerWallet,
    paymentToken: campaign.paymentToken,
    feePaid: state.config.campaignCreationFee,
    mintMode: campaign.mintMode,
    templateImageUri: campaign.templateImageUri,
  });
  return campaign;
}

export function purchaseMembership(input: { campaignId: string; buyerWallet: string }): PurchaseResult {
  const state = readStore();
  const campaign = state.campaigns.find((entry) => entry.id === input.campaignId);
  if (!campaign) {
    throw new Error("campaign_not_found");
  }
  if (campaign.status !== "active") {
    throw new Error("campaign_not_active");
  }
  if (campaign.maxSupply !== null && campaign.mintedSupply >= campaign.maxSupply) {
    throw new Error("campaign_sold_out");
  }
  if (campaign.expiresAtUnix !== null && campaign.expiresAtUnix < nowUnix()) {
    throw new Error("campaign_expired");
  }
  // Live-event campaigns share the same purchase endpoint, but minting is intentionally gated
  // until the owner-defined event start time.
  if (campaign.mintMode === "live_event" && campaign.mintStartsAtUnix !== null && campaign.mintStartsAtUnix > nowUnix()) {
    throw new Error("mint_not_started");
  }

  const paidAmount = parseAmount(campaign.priceAtomic);
  if (!paidAmount) {
    throw new Error("invalid_price");
  }

  const club = state.clubs.find((entry) => entry.id === campaign.clubId);
  if (!club) {
    throw new Error("club_not_found");
  }

  campaign.mintedSupply += 1;
  state.ledger.incomingDeposits += paidAmount;

  const membership: Membership = {
    id: createId("mship"),
    campaignId: campaign.id,
    ownerWallet: input.buyerWallet,
    nftMint: createId("mint"),
    purchasedAtUnix: nowUnix(),
    expiresAtUnix: campaign.expiresAtUnix,
    revoked: false,
  };

  const asset = mintMembershipAsset({
    club,
    campaign,
    membership,
  });

  membership.assetId = asset.assetId;
  membership.metadataUri = asset.metadataUri;

  state.memberships.push(membership);
  state.assets.push(asset);

  writeStore(state);
  appendEvent("membership_purchased", {
    membershipId: membership.id,
    campaignId: membership.campaignId,
    ownerWallet: membership.ownerWallet,
    nftMint: membership.nftMint,
    assetId: asset.assetId,
    metadataUri: asset.metadataUri,
    paidAmount,
  });

  return { membership, asset, paidAmount };
}

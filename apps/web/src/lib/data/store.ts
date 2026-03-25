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
} from "@proofmembership/types";

type PlatformConfig = {
  initialized: boolean;
  ownerApprovalFee: number;
  clubCreationFee: number;
  campaignCreationFee: number;
  defaultCampaignFeeBps: number;
  defaultMinCampaignFeeAtomic: string;
};

export type OwnerApplication = {
  id: string;
  wallet: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAtUnix: number;
  reviewedAtUnix: number | null;
  reviewNote: string | null;
};

type PlatformLedger = {
  incomingDeposits: number;
  platformBalance: number;
};

type PlatformState = {
  config: PlatformConfig;
  ledger: PlatformLedger;
  approvedOwners: string[];
  ownerApplications: OwnerApplication[];
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
  platformFeeAtomic: string;
  ownerReceivesAtomic: string;
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

const DATA_DIR = path.join(resolveRepoRoot(), ".proofmembership", "indexer");
const MODEL_FILE = path.join(DATA_DIR, "read-model.json");
const EVENT_FILE = path.join(DATA_DIR, "events.json");

const initialState: PlatformState = {
  config: {
    initialized: false,
    ownerApprovalFee: 0.5,
    clubCreationFee: 1,
    campaignCreationFee: 0.5,
    defaultCampaignFeeBps: 200,
    defaultMinCampaignFeeAtomic: "0.000300",
  },
  ledger: {
    incomingDeposits: 0,
    platformBalance: 0,
  },
  approvedOwners: [],
  ownerApplications: [],
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
  if (!Array.isArray(parsed.approvedOwners)) {
    parsed.approvedOwners = [];
  }
  if (!Array.isArray(parsed.ownerApplications)) {
    parsed.ownerApplications = [];
  }
  parsed.ownerApplications = parsed.ownerApplications.map((application) => ({
    ...application,
    reviewNote: typeof application.reviewNote === "string" ? application.reviewNote : null,
  }));
  if (!Array.isArray(parsed.assets)) {
    parsed.assets = [];
  }
  parsed.clubs = parsed.clubs.map((club) => ({
    ...club,
    onchainAddress: typeof club.onchainAddress === "string" ? club.onchainAddress : undefined,
  }));
  parsed.campaigns = parsed.campaigns.map((campaign) => ({
    ...campaign,
    onchainAddress: typeof campaign.onchainAddress === "string" ? campaign.onchainAddress : undefined,
  }));
  if (typeof parsed.config.ownerApprovalFee !== "number" || !Number.isFinite(parsed.config.ownerApprovalFee) || parsed.config.ownerApprovalFee < 0) {
    parsed.config.ownerApprovalFee = initialState.config.ownerApprovalFee;
  }
  return parsed;
}

function writeStore(state: PlatformState): void {
  ensureStorage();
  fs.writeFileSync(MODEL_FILE, JSON.stringify(state, null, 2), "utf8");
}

function appendEvent(type: string, payload: Record<string, unknown>): void {
  ensureStorage();
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

function toFixedAtomic(value: number): string {
  return value.toFixed(6);
}

function calculatePlatformAndOwnerSplit(input: {
  priceAtomic: string;
  feeBps: number;
  minFeeAtomic: string;
}): { paidAmount: number; platformFee: number; ownerReceives: number } {
  const paidAmount = parseAmount(input.priceAtomic);
  if (!paidAmount) {
    throw new Error("invalid_price");
  }

  if (!Number.isFinite(input.feeBps) || input.feeBps < 0 || input.feeBps > 10_000) {
    throw new Error("invalid_campaign_fee_bps");
  }

  const minFee = Number(input.minFeeAtomic);
  if (!Number.isFinite(minFee) || minFee < 0) {
    throw new Error("invalid_min_campaign_fee");
  }

  const bpsFee = (paidAmount * input.feeBps) / 10_000;
  const platformFee = Math.min(paidAmount, Math.max(minFee, bpsFee));
  const ownerReceives = Math.max(0, paidAmount - platformFee);

  return { paidAmount, platformFee, ownerReceives };
}

function buildMembershipMetadata(input: {
  club: Club;
  campaign: Campaign;
  membership: Membership;
}): MembershipNftMetadata {
  const expiresAtValue = input.membership.expiresAtUnix ?? "none";
  return {
    name: `${input.club.slug} ${input.campaign.name} Membership`,
    symbol: "PROOF",
    description: `Membership access NFT for ${input.club.slug} / ${input.campaign.name}.`,
    image: input.campaign.templateImageUri,
    external_url: "https://proofmembership.app/storefront",
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
  standard?: "cnft" | "nft";
  compression?: "bubblegum" | "none";
  provenance?: "synthetic_local" | "onchain";
}): MintedMembershipAsset {
  const metadata = buildMembershipMetadata(input);
  const assetId = createId("asset");
  return {
    assetId,
    membershipId: input.membership.id,
    standard: input.standard ?? "cnft",
    compression: input.compression ?? "bubblegum",
    metadataUri: `/api/metadata/${assetId}`,
    metadata,
    mintAddress: input.membership.nftMint,
    mintTxSignature: input.membership.mintTxSignature,
    metadataAccount: input.membership.metadataAccount,
    tokenAccount: input.membership.tokenAccount,
    provenance: input.provenance ?? "synthetic_local",
    mintedAtUnix: nowUnix(),
  };
}

function assertCampaignPurchasable(campaign: Campaign): void {
  if (campaign.status !== "active") {
    throw new Error("campaign_not_active");
  }
  if (campaign.maxSupply !== null && campaign.mintedSupply >= campaign.maxSupply) {
    throw new Error("campaign_sold_out");
  }
  if (campaign.expiresAtUnix !== null && campaign.expiresAtUnix < nowUnix()) {
    throw new Error("campaign_expired");
  }
  if (campaign.mintMode === "live_event" && campaign.mintStartsAtUnix !== null && campaign.mintStartsAtUnix > nowUnix()) {
    throw new Error("mint_not_started");
  }
}

export function initializePlatform(config: {
  ownerApprovalFee: number;
  clubCreationFee: number;
  campaignCreationFee: number;
  defaultCampaignFeeBps: number;
  defaultMinCampaignFeeAtomic: string;
}): PlatformConfig {
  if (!Number.isFinite(config.defaultCampaignFeeBps) || config.defaultCampaignFeeBps < 0 || config.defaultCampaignFeeBps > 10_000) {
    throw new Error("invalid_campaign_fee_bps");
  }

  const minFee = Number(config.defaultMinCampaignFeeAtomic);
  if (!Number.isFinite(minFee) || minFee < 0) {
    throw new Error("invalid_min_campaign_fee");
  }
  if (!Number.isFinite(config.ownerApprovalFee) || config.ownerApprovalFee < 0) {
    throw new Error("invalid_owner_approval_fee");
  }

  const state = readStore();
  state.config = {
    initialized: true,
    ownerApprovalFee: config.ownerApprovalFee,
    clubCreationFee: config.clubCreationFee,
    campaignCreationFee: config.campaignCreationFee,
    defaultCampaignFeeBps: config.defaultCampaignFeeBps,
    defaultMinCampaignFeeAtomic: toFixedAtomic(minFee),
  };
  writeStore(state);
  appendEvent("platform_initialized", {
    ownerApprovalFee: config.ownerApprovalFee,
    clubCreationFee: config.clubCreationFee,
    campaignCreationFee: config.campaignCreationFee,
    defaultCampaignFeeBps: config.defaultCampaignFeeBps,
    defaultMinCampaignFeeAtomic: toFixedAtomic(minFee),
  });
  return state.config;
}

export function getAdminOverview() {
  const state = readStore();
  const pendingOwnerApplications = state.ownerApplications.filter((application) => application.status === "pending").length;
  return {
    approvedOwners: state.approvedOwners.length,
    pendingOwnerApplications,
    owners: new Set(state.clubs.map((club) => club.ownerWallet)).size,
    clubs: state.clubs.length,
    campaigns: state.campaigns.length,
    activeCampaigns: state.campaigns.filter((campaign) => campaign.status === "active").length,
    incomingDepositsAtomic: state.ledger.incomingDeposits.toFixed(6),
    platformBalanceAtomic: state.ledger.platformBalance.toFixed(6),
    config: state.config,
  };
}

export function listClubs(): Club[] {
  return readStore().clubs;
}

export function listOwnerApplications(status?: OwnerApplication["status"]): OwnerApplication[] {
  const applications = readStore().ownerApplications;
  if (!status) {
    return applications;
  }
  return applications.filter((application) => application.status === status);
}

export function isApprovedOwner(wallet: string): boolean {
  const normalized = wallet.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const state = readStore();
  const approved = state.approvedOwners.some((entry) => entry.toLowerCase() === normalized);
  if (approved) {
    return true;
  }

  return state.clubs.some((club) => club.ownerWallet.toLowerCase() === normalized);
}

export function submitOwnerApplication(input: { wallet: string; description: string }): OwnerApplication {
  const wallet = input.wallet.trim();
  const description = input.description.trim();
  if (!wallet) {
    throw new Error("wallet_required");
  }
  if (!description) {
    throw new Error("description_required");
  }

  const state = readStore();
  const existing = state.ownerApplications.find((application) => application.wallet.toLowerCase() === wallet.toLowerCase() && application.status === "pending");
  if (existing) {
    throw new Error("pending_application_exists");
  }

  if (isApprovedOwner(wallet)) {
    throw new Error("owner_already_approved");
  }

  const application: OwnerApplication = {
    id: createId("oapp"),
    wallet,
    description,
    status: "pending",
    createdAtUnix: nowUnix(),
    reviewedAtUnix: null,
    reviewNote: null,
  };

  state.ownerApplications.push(application);
  writeStore(state);
  appendEvent("owner_application_submitted", {
    applicationId: application.id,
    wallet: application.wallet,
  });
  return application;
}

export function approveOwnerApplication(input: { applicationId: string; feePaid: number }): OwnerApplication {
  const state = readStore();
  const application = state.ownerApplications.find((entry) => entry.id === input.applicationId);
  if (!application) {
    throw new Error("owner_application_not_found");
  }
  if (application.status !== "pending") {
    throw new Error("owner_application_not_pending");
  }
  if (input.feePaid < state.config.ownerApprovalFee) {
    throw new Error("insufficient_owner_approval_fee");
  }

  application.status = "approved";
  application.reviewedAtUnix = nowUnix();
  application.reviewNote = null;

  if (!state.approvedOwners.some((wallet) => wallet.toLowerCase() === application.wallet.toLowerCase())) {
    state.approvedOwners.push(application.wallet);
  }

  state.ledger.incomingDeposits += input.feePaid;
  state.ledger.platformBalance += input.feePaid;
  writeStore(state);

  appendEvent("owner_application_approved", {
    applicationId: application.id,
    wallet: application.wallet,
    feePaid: input.feePaid,
  });

  return application;
}

export function rejectOwnerApplication(input: { applicationId: string; reviewNote?: string }): OwnerApplication {
  const state = readStore();
  const application = state.ownerApplications.find((entry) => entry.id === input.applicationId);
  if (!application) {
    throw new Error("owner_application_not_found");
  }
  if (application.status !== "pending") {
    throw new Error("owner_application_not_pending");
  }

  const reviewNote = String(input.reviewNote ?? "").trim();
  application.status = "rejected";
  application.reviewedAtUnix = nowUnix();
  application.reviewNote = reviewNote || null;

  writeStore(state);

  appendEvent("owner_application_rejected", {
    applicationId: application.id,
    wallet: application.wallet,
    reviewNote: application.reviewNote,
  });

  return application;
}

export function findClub(clubId: string): Club | null {
  return readStore().clubs.find((club) => club.id === clubId) ?? null;
}

export function listCampaignsByClub(clubId: string): Campaign[] {
  return readStore().campaigns.filter((campaign) => campaign.clubId === clubId);
}

export function findCampaignById(campaignId: string): Campaign | null {
  return readStore().campaigns.find((campaign) => campaign.id === campaignId) ?? null;
}

export function setCampaignOnchainAddress(input: { campaignId: string; onchainAddress: string }): Campaign {
  const campaignId = input.campaignId.trim();
  const onchainAddress = input.onchainAddress.trim();
  if (!campaignId) {
    throw new Error("campaign_id_required");
  }
  if (!onchainAddress) {
    throw new Error("onchain_address_required");
  }

  const state = readStore();
  const campaign = state.campaigns.find((entry) => entry.id === campaignId);
  if (!campaign) {
    throw new Error("campaign_not_found");
  }

  campaign.onchainAddress = onchainAddress;
  writeStore(state);
  appendEvent("campaign_onchain_address_set", {
    campaignId: campaign.id,
    onchainAddress,
  });
  return campaign;
}

export function listMembershipsByWallet(wallet: string): Membership[] {
  return readStore().memberships.filter((membership) => membership.ownerWallet.toLowerCase() === wallet.toLowerCase());
}

export function findAssetById(assetId: string): MintedMembershipAsset | null {
  return readStore().assets.find((asset) => asset.assetId === assetId) ?? null;
}

export function setClubFeePolicy(input: {
  clubId: string;
  campaignFeeBps: number;
  minCampaignFeeAtomic: string;
}): Club {
  const state = readStore();
  const club = state.clubs.find((entry) => entry.id === input.clubId);
  if (!club) {
    throw new Error("club_not_found");
  }

  if (!Number.isFinite(input.campaignFeeBps) || input.campaignFeeBps < 0 || input.campaignFeeBps > 10_000) {
    throw new Error("invalid_campaign_fee_bps");
  }

  const minFee = Number(input.minCampaignFeeAtomic);
  if (!Number.isFinite(minFee) || minFee < 0) {
    throw new Error("invalid_min_campaign_fee");
  }

  club.campaignFeeBps = input.campaignFeeBps;
  club.minCampaignFeeAtomic = toFixedAtomic(minFee);

  writeStore(state);
  appendEvent("club_fee_policy_updated", {
    clubId: club.id,
    campaignFeeBps: club.campaignFeeBps,
    minCampaignFeeAtomic: club.minCampaignFeeAtomic,
  });

  return club;
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
  if (!state.approvedOwners.some((wallet) => wallet.toLowerCase() === input.ownerWallet.toLowerCase())) {
    throw new Error("owner_not_approved");
  }
  if (state.clubs.some((club) => club.slug.toLowerCase() === input.slug.toLowerCase())) {
    throw new Error("slug_already_exists");
  }

  const club: Club = {
    id: createId("club"),
    slug: input.slug,
    ownerWallet: input.ownerWallet,
    metadataUri: input.metadataUri,
    onchainAddress: undefined,
    campaignFeeBps: state.config.defaultCampaignFeeBps,
    minCampaignFeeAtomic: state.config.defaultMinCampaignFeeAtomic,
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
    campaignFeeBps: club.campaignFeeBps,
    minCampaignFeeAtomic: club.minCampaignFeeAtomic,
  });
  return club;
}

export function createCampaign(input: {
  clubId: string;
  ownerWallet: string;
  name: string;
  priceAtomic: string;
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
    paymentToken: "SOL",
    templateImageUri: input.templateImageUri,
    onchainAddress: undefined,
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
  assertCampaignPurchasable(campaign);

  const club = state.clubs.find((entry) => entry.id === campaign.clubId);
  if (!club) {
    throw new Error("club_not_found");
  }

  const split = calculatePlatformAndOwnerSplit({
    priceAtomic: campaign.priceAtomic,
    feeBps: club.campaignFeeBps,
    minFeeAtomic: club.minCampaignFeeAtomic,
  });

  campaign.mintedSupply += 1;
  state.ledger.incomingDeposits += split.paidAmount;
  state.ledger.platformBalance += split.platformFee;

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
  membership.mintTxSignature = undefined;
  membership.metadataAccount = undefined;
  membership.tokenAccount = undefined;

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
    paidAmount: split.paidAmount,
    platformFeeAtomic: toFixedAtomic(split.platformFee),
    ownerReceivesAtomic: toFixedAtomic(split.ownerReceives),
  });

  return {
    membership,
    asset,
    paidAmount: split.paidAmount,
    platformFeeAtomic: toFixedAtomic(split.platformFee),
    ownerReceivesAtomic: toFixedAtomic(split.ownerReceives),
  };
}

export function projectOnchainMembershipPurchase(input: {
  campaignId: string;
  buyerWallet: string;
  txSignature: string;
}): PurchaseResult {
  const campaignId = input.campaignId.trim();
  const buyerWallet = input.buyerWallet.trim();
  const txSignature = input.txSignature.trim();

  if (!campaignId || !buyerWallet || !txSignature) {
    throw new Error("missing_required_fields");
  }

  const state = readStore();
  const campaign = state.campaigns.find((entry) => entry.id === campaignId);
  if (!campaign) {
    throw new Error("campaign_not_found");
  }
  assertCampaignPurchasable(campaign);

  if (state.memberships.some((membership) => membership.mintTxSignature === txSignature)) {
    throw new Error("tx_signature_already_projected");
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

  const syntheticMint = `onchain-${txSignature.slice(0, 24)}`;
  const membership: Membership = {
    id: createId("mship"),
    campaignId: campaign.id,
    ownerWallet: buyerWallet,
    nftMint: syntheticMint,
    purchasedAtUnix: nowUnix(),
    expiresAtUnix: campaign.expiresAtUnix,
    revoked: false,
    mintTxSignature: txSignature,
    metadataAccount: undefined,
    tokenAccount: undefined,
  };

  const asset = mintMembershipAsset({
    club,
    campaign,
    membership,
    standard: "nft",
    compression: "none",
    provenance: "onchain",
  });

  membership.assetId = asset.assetId;
  membership.metadataUri = asset.metadataUri;

  state.memberships.push(membership);
  state.assets.push(asset);

  writeStore(state);
  appendEvent("membership_onchain_projected", {
    membershipId: membership.id,
    campaignId: membership.campaignId,
    ownerWallet: membership.ownerWallet,
    nftMint: membership.nftMint,
    txSignature,
    assetId: asset.assetId,
    metadataUri: asset.metadataUri,
    paidAmount,
  });

  return {
    membership,
    asset,
    paidAmount,
    platformFeeAtomic: toFixedAtomic(0),
    ownerReceivesAtomic: toFixedAtomic(0),
  };
}

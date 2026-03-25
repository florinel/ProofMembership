export type Role = "public" | "member" | "owner" | "admin";

export interface Club {
  id: string;
  slug: string;
  ownerWallet: string;
  metadataUri: string;
  onchainAddress?: string;
  campaignFeeBps: number;
  minCampaignFeeAtomic: string;
}

export type PaymentToken = "SOL";

export type MintMode = "on_purchase" | "live_event";

export interface Campaign {
  id: string;
  clubId: string;
  name: string;
  priceAtomic: string;
  paymentToken: PaymentToken;
  templateImageUri: string;
  onchainAddress?: string;
  mintMode: MintMode;
  mintStartsAtUnix: number | null;
  maxSupply: number | null;
  mintedSupply: number;
  expiresAtUnix: number | null;
  status: "active" | "paused" | "closed";
}

export interface Membership {
  id: string;
  campaignId: string;
  ownerWallet: string;
  nftMint: string;
  assetId?: string;
  metadataUri?: string;
  mintTxSignature?: string;
  metadataAccount?: string;
  tokenAccount?: string;
  purchasedAtUnix: number;
  expiresAtUnix: number | null;
  revoked: boolean;
}

export interface MetadataAttribute {
  trait_type: string;
  value: string | number | boolean;
}

export interface MembershipNftMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: MetadataAttribute[];
  properties: {
    category: "image";
    files: Array<{
      uri: string;
      type: string;
    }>;
  };
}

export interface MintedMembershipAsset {
  assetId: string;
  membershipId: string;
  standard: "cnft" | "nft";
  compression: "bubblegum" | "none";
  metadataUri: string;
  metadata: MembershipNftMetadata;
  mintAddress?: string;
  metadataAccount?: string;
  tokenAccount?: string;
  mintTxSignature?: string;
  provenance?: "synthetic_local" | "onchain";
  mintedAtUnix: number;
}

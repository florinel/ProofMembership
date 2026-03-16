export type Role = "public" | "member" | "owner" | "admin";

export interface Club {
  id: string;
  slug: string;
  ownerWallet: string;
  metadataUri: string;
}

export type PaymentToken = "SOL" | "USDC";

export type MintMode = "on_purchase" | "live_event";

export interface Campaign {
  id: string;
  clubId: string;
  name: string;
  priceAtomic: string;
  paymentToken: PaymentToken;
  templateImageUri: string;
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
  mintedAtUnix: number;
}

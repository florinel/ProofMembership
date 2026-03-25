import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as web3 from "@solana/web3.js";
import bs58 from "bs58";

import {
  __resetStoreForTests,
  approveOwnerApplication,
  createCampaign,
  createClub,
  initializePlatform,
  setCampaignOnchainAddress,
  submitOwnerApplication,
} from "@/lib/data/store";
import { purchaseMembershipOnchain, verifyOnchainPurchaseTx } from "@/lib/chain/purchase";

const TEST_PROGRAM_ID = "3Ne2f2pLbgpsWL3v9xCDy6VjKmoqHjbBtEJL3a6tMuCs";
const TEST_TREASURY = "8nYfQmYQkSg4EjD7o2J6JPx8d7CyQakR2N3w3e7v2A7w";
const TEST_BUYER = "7Y5pNL4QYSLW8m2PmfVwLCq9FSu8ap6gXNu4L4xWmDk1";
const TEST_CLUB = "7mDx8zT6Qh4xWk1nP2aLb9vC5fR3jN6yU1qE8sK4tHc";
const TEST_OWNER = "9fYp2xV7mN3aK8qR1tW6cLb4hJ5sD2uE7zP9vQ3rT6w";

function discriminatorData(): string {
  return bs58.encode(Buffer.from("e2380edc684600e1", "hex"));
}

function mockParsedPurchaseTx(input: {
  buyer: string;
  platformPda: string;
  campaignAddress: string;
  clubAddress: string;
  platformTreasury: string;
  ownerTreasury: string;
  programId: string;
  paidLamports: number;
  writableOverrides?: Partial<Record<"buyer" | "platformPda" | "campaign" | "club" | "platformTreasury" | "ownerTreasury", boolean>>;
  buyerSigner?: boolean;
}): void {
  const accountKeys = [
    input.buyer,
    input.platformPda,
    input.campaignAddress,
    input.clubAddress,
    input.platformTreasury,
    input.ownerTreasury,
  ];

  const pre = [10_000_000_000, 0, 0, 0, 1_000_000_000, 2_000_000_000];
  const ownerShare = Math.floor(input.paidLamports / 2);
  const platformShare = input.paidLamports - ownerShare;
  const post = [
    10_000_000_000 - input.paidLamports,
    0,
    0,
    0,
    1_000_000_000 + platformShare,
    2_000_000_000 + ownerShare,
  ];

  vi.spyOn(web3.Connection.prototype, "getParsedTransaction").mockResolvedValue({
    meta: {
      err: null,
      preBalances: pre,
      postBalances: post,
    },
    transaction: {
      message: {
        accountKeys: accountKeys.map((address, index) => ({
          pubkey: new web3.PublicKey(address),
          signer: index === 0 ? (input.buyerSigner ?? true) : false,
          writable: (
            input.writableOverrides?.[
              index === 0
                ? "buyer"
                : index === 1
                  ? "platformPda"
                  : index === 2
                    ? "campaign"
                    : index === 3
                      ? "club"
                      : index === 4
                        ? "platformTreasury"
                        : "ownerTreasury"
            ]
            ?? (index === 0 || index === 2 || index === 3 || index === 4 || index === 5)
          ),
        })),
        instructions: [
          {
            programId: input.programId,
            accounts: accountKeys,
            data: discriminatorData(),
          },
        ],
      },
    },
  } as unknown as web3.ParsedTransactionWithMeta);
}

function mockOnchainCampaignPointers(): void {
  const club = new web3.PublicKey(TEST_CLUB);
  const owner = new web3.PublicKey(TEST_OWNER);

  const discriminator = Buffer.alloc(8, 0);
  const payload = Buffer.concat([discriminator, club.toBuffer(), owner.toBuffer(), Buffer.alloc(16, 0)]);

  vi.spyOn(web3.Connection.prototype, "getAccountInfo").mockResolvedValue({
    owner: new web3.PublicKey(TEST_PROGRAM_ID),
    data: payload,
    executable: false,
    lamports: 1,
    rentEpoch: 0,
  } as unknown as web3.AccountInfo<Buffer>);
}

function seedCampaign(): { campaignId: string } {
  initializePlatform({
    ownerApprovalFee: 0.5,
    clubCreationFee: 1,
    campaignCreationFee: 0.5,
    defaultCampaignFeeBps: 200,
    defaultMinCampaignFeeAtomic: "0.0003",
  });

  const application = submitOwnerApplication({
    wallet: "4Nd1mJrNnk7U2fTH8QW5Jf3EXAMPLe1111111111111111111",
    description: "Test owner",
  });

  approveOwnerApplication({
    applicationId: application.id,
    feePaid: 0.5,
  });

  const club = createClub({
    slug: "test-club",
    ownerWallet: "4Nd1mJrNnk7U2fTH8QW5Jf3EXAMPLe1111111111111111111",
    metadataUri: "https://example.com/club.json",
    feePaid: 1,
  });

  const campaign = createCampaign({
    clubId: club.id,
    ownerWallet: "4Nd1mJrNnk7U2fTH8QW5Jf3EXAMPLe1111111111111111111",
    name: "Onchain Campaign",
    priceAtomic: "1",
    templateImageUri: "https://example.com/template.png",
    mintMode: "on_purchase",
    mintStartsAtUnix: null,
    maxSupply: null,
    expiresAtUnix: null,
  });

  return { campaignId: campaign.id };
}

function seedCampaignWithOnchainAddress(): { campaignId: string } {
  const seeded = seedCampaign();
  setCampaignOnchainAddress({
    campaignId: seeded.campaignId,
    onchainAddress: "6Q8Yg3vBf2iM7mWqL4nXbYd9pQk2tRj6hJ4sN8zP1cVa",
  });
  return seeded;
}

describe("purchaseMembershipOnchain preflight", () => {
  const originalRpc = process.env.PROOFMEMBERSHIP_RPC_URL;
  const originalProgramId = process.env.PROOFMEMBERSHIP_PROGRAM_ID;
  const originalTreasury = process.env.PROOFMEMBERSHIP_PLATFORM_TREASURY;

  beforeEach(() => {
    vi.restoreAllMocks();
    __resetStoreForTests();
    process.env.PROOFMEMBERSHIP_RPC_URL = "http://127.0.0.1:8899";
    process.env.PROOFMEMBERSHIP_PROGRAM_ID = TEST_PROGRAM_ID;
    process.env.PROOFMEMBERSHIP_PLATFORM_TREASURY = TEST_TREASURY;
    mockOnchainCampaignPointers();
  });

  afterEach(() => {
    process.env.PROOFMEMBERSHIP_RPC_URL = originalRpc;
    process.env.PROOFMEMBERSHIP_PROGRAM_ID = originalProgramId;
    process.env.PROOFMEMBERSHIP_PLATFORM_TREASURY = originalTreasury;
    vi.restoreAllMocks();
  });

  it("rejects invalid buyer wallet", async () => {
    const { campaignId } = seedCampaign();

    await expect(
      purchaseMembershipOnchain({
        campaignId,
        buyerWallet: "not-a-wallet",
      })
    ).rejects.toThrowError("invalid_buyer_wallet");
  });

  it("rejects missing required env", async () => {
    const { campaignId } = seedCampaignWithOnchainAddress();
    delete process.env.PROOFMEMBERSHIP_RPC_URL;

    await expect(
      purchaseMembershipOnchain({
        campaignId,
        buyerWallet: TEST_BUYER,
      })
    ).rejects.toThrowError("missing_env_proofmembership_rpc_url");
  });

  it("returns purchase intent when preflight passes", async () => {
    const { campaignId } = seedCampaignWithOnchainAddress();

    const result = await purchaseMembershipOnchain({
      campaignId,
      buyerWallet: TEST_BUYER,
    });

    expect(result.purchaseIntent.kind).toBe("onchain_purchase_intent");
    expect(result.purchaseIntent.executionMode).toBe("anchor_purchase_membership");
    expect(result.purchaseIntent.campaignId).toBe(campaignId);
    expect(result.purchaseIntent.clubOnchainAddress).toBe(TEST_CLUB);
    expect(result.purchaseIntent.ownerTreasury).toBe(TEST_OWNER);
    const [expectedPlatformPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      new web3.PublicKey(TEST_PROGRAM_ID)
    );
    expect(result.purchaseIntent.platformConfigPda).toBe(expectedPlatformPda.toBase58());
    expect(result.purchaseIntent.quotedAmountSol).toBe("1.000000");
    expect(result.purchaseIntent.quotedAmountLamports).toBe(1_000_000_000);
    expect(result.purchaseIntent.programId).toBe(TEST_PROGRAM_ID);
    expect(result.purchaseIntent.suggestedCommitment).toBe("confirmed");
  });

  it("requires campaign onchain address mapping", async () => {
    const { campaignId } = seedCampaign();

    await expect(
      purchaseMembershipOnchain({
        campaignId,
        buyerWallet: TEST_BUYER,
      })
    ).rejects.toThrowError("campaign_onchain_address_missing");
  });

  it("verifies parsed onchain purchase transaction with expected amount", async () => {
    const { campaignId } = seedCampaignWithOnchainAddress();
    const [platformPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      new web3.PublicKey(TEST_PROGRAM_ID)
    );

    mockParsedPurchaseTx({
      buyer: TEST_BUYER,
      platformPda: platformPda.toBase58(),
      campaignAddress: "6Q8Yg3vBf2iM7mWqL4nXbYd9pQk2tRj6hJ4sN8zP1cVa",
      clubAddress: TEST_CLUB,
      platformTreasury: TEST_TREASURY,
      ownerTreasury: TEST_OWNER,
      programId: TEST_PROGRAM_ID,
      paidLamports: 1_000_000_000,
    });

    await expect(
      verifyOnchainPurchaseTx({
        campaignId,
        buyerWallet: TEST_BUYER,
        txSignature: "3Y2u9pWq6xB1kL8mR3tN7dC5vH2sE9fJ1aP6qZ3xT8n",
      })
    ).resolves.toBeUndefined();
  });

  it("rejects parsed onchain transaction with mismatched amount", async () => {
    const { campaignId } = seedCampaignWithOnchainAddress();
    const [platformPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      new web3.PublicKey(TEST_PROGRAM_ID)
    );

    mockParsedPurchaseTx({
      buyer: TEST_BUYER,
      platformPda: platformPda.toBase58(),
      campaignAddress: "6Q8Yg3vBf2iM7mWqL4nXbYd9pQk2tRj6hJ4sN8zP1cVa",
      clubAddress: TEST_CLUB,
      platformTreasury: TEST_TREASURY,
      ownerTreasury: TEST_OWNER,
      programId: TEST_PROGRAM_ID,
      paidLamports: 500_000_000,
    });

    await expect(
      verifyOnchainPurchaseTx({
        campaignId,
        buyerWallet: TEST_BUYER,
        txSignature: "3Y2u9pWq6xB1kL8mR3tN7dC5vH2sE9fJ1aP6qZ3xT8n",
      })
    ).rejects.toThrowError("onchain_tx_amount_mismatch");
  });

  it("rejects parsed onchain transaction when campaign account is not writable", async () => {
    const { campaignId } = seedCampaignWithOnchainAddress();
    const [platformPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      new web3.PublicKey(TEST_PROGRAM_ID)
    );

    mockParsedPurchaseTx({
      buyer: TEST_BUYER,
      platformPda: platformPda.toBase58(),
      campaignAddress: "6Q8Yg3vBf2iM7mWqL4nXbYd9pQk2tRj6hJ4sN8zP1cVa",
      clubAddress: TEST_CLUB,
      platformTreasury: TEST_TREASURY,
      ownerTreasury: TEST_OWNER,
      programId: TEST_PROGRAM_ID,
      paidLamports: 1_000_000_000,
      writableOverrides: { campaign: false },
    });

    await expect(
      verifyOnchainPurchaseTx({
        campaignId,
        buyerWallet: TEST_BUYER,
        txSignature: "3Y2u9pWq6xB1kL8mR3tN7dC5vH2sE9fJ1aP6qZ3xT8n",
      })
    ).rejects.toThrowError("onchain_tx_campaign_not_writable");
  });

  it("rejects campaign account owned by the wrong program", async () => {
    const { campaignId } = seedCampaignWithOnchainAddress();

    vi.spyOn(web3.Connection.prototype, "getAccountInfo").mockResolvedValue({
      owner: new web3.PublicKey(TEST_TREASURY),
      data: Buffer.alloc(72),
      executable: false,
      lamports: 1,
      rentEpoch: 0,
    } as unknown as web3.AccountInfo<Buffer>);

    await expect(
      purchaseMembershipOnchain({
        campaignId,
        buyerWallet: TEST_BUYER,
      })
    ).rejects.toThrowError("campaign_program_mismatch");
  });

  it("requires tx signature before transaction verification", async () => {
    const { campaignId } = seedCampaignWithOnchainAddress();

    await expect(
      verifyOnchainPurchaseTx({
        campaignId,
        buyerWallet: TEST_BUYER,
        txSignature: "   ",
      })
    ).rejects.toThrowError("tx_signature_required");
  });

  it("rejects parsed onchain transaction missing buyer signer", async () => {
    const { campaignId } = seedCampaignWithOnchainAddress();
    const [platformPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      new web3.PublicKey(TEST_PROGRAM_ID)
    );

    mockParsedPurchaseTx({
      buyer: TEST_BUYER,
      platformPda: platformPda.toBase58(),
      campaignAddress: "6Q8Yg3vBf2iM7mWqL4nXbYd9pQk2tRj6hJ4sN8zP1cVa",
      clubAddress: TEST_CLUB,
      platformTreasury: TEST_TREASURY,
      ownerTreasury: TEST_OWNER,
      programId: TEST_PROGRAM_ID,
      paidLamports: 1_000_000_000,
      buyerSigner: false,
    });

    await expect(
      verifyOnchainPurchaseTx({
        campaignId,
        buyerWallet: TEST_BUYER,
        txSignature: "3Y2u9pWq6xB1kL8mR3tN7dC5vH2sE9fJ1aP6qZ3xT8n",
      })
    ).rejects.toThrowError("onchain_tx_missing_buyer_signer");
  });
});

import bs58 from "bs58";
import { Connection, PublicKey } from "@solana/web3.js";

import { findCampaignById } from "@/lib/data/store";

type OnchainPurchaseInput = {
  campaignId: string;
  buyerWallet: string;
};

export type OnchainPurchaseIntent = {
  kind: "onchain_purchase_intent";
  executionMode: "anchor_purchase_membership";
  campaignId: string;
  campaignOnchainAddress: string;
  clubOnchainAddress: string;
  buyerWallet: string;
  ownerTreasury: string;
  quotedAmountSol: string;
  quotedAmountLamports: number;
  rpcUrl: string;
  programId: string;
  platformConfigPda: string;
  platformTreasury: string;
  suggestedCommitment: "confirmed";
};

export type OnchainPurchaseResult = {
  purchaseIntent: OnchainPurchaseIntent;
};

const PURCHASE_MEMBERSHIP_DISCRIMINATOR = Buffer.from("e2380edc684600e1", "hex");

function assertValidWalletAddress(wallet: string): void {
  let decoded: Uint8Array;
  try {
    decoded = bs58.decode(wallet);
  } catch {
    throw new Error("invalid_buyer_wallet");
  }

  if (decoded.length !== 32) {
    throw new Error("invalid_buyer_wallet");
  }
}

function getRequiredEnv(name: string): string {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`missing_env_${name.toLowerCase()}`);
  }
  return value;
}

function derivePlatformConfigPda(programId: string): string {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("platform")], new PublicKey(programId));
  return pda.toBase58();
}

async function loadCampaignPointersFromChain(input: {
  rpcUrl: string;
  campaignOnchainAddress: string;
  programId: string;
}): Promise<{ clubOnchainAddress: string; ownerTreasury: string }> {
  const connection = new Connection(input.rpcUrl, "confirmed");
  const campaignPubkey = new PublicKey(input.campaignOnchainAddress);
  const accountInfo = await connection.getAccountInfo(campaignPubkey, "confirmed");
  if (!accountInfo) {
    throw new Error("campaign_onchain_account_not_found");
  }

  if (accountInfo.owner.toBase58() !== input.programId) {
    throw new Error("campaign_program_mismatch");
  }

  if (accountInfo.data.length < 8 + 64) {
    throw new Error("invalid_campaign_account_data");
  }

  const payload = accountInfo.data.subarray(8);
  const clubOnchainAddress = new PublicKey(payload.subarray(0, 32)).toBase58();
  const ownerTreasury = new PublicKey(payload.subarray(32, 64)).toBase58();

  return {
    clubOnchainAddress,
    ownerTreasury,
  };
}

function getCampaignOnchainAddress(campaignId: string): string {
  const campaign = findCampaignById(campaignId);
  if (!campaign) {
    throw new Error("campaign_not_found");
  }
  if (!campaign.onchainAddress) {
    throw new Error("campaign_onchain_address_missing");
  }

  return campaign.onchainAddress;
}

function getCampaignPriceQuote(campaignId: string): { quotedAmountSol: string; quotedAmountLamports: number } {
  const campaign = findCampaignById(campaignId);
  if (!campaign) {
    throw new Error("campaign_not_found");
  }

  const amountSol = Number(campaign.priceAtomic);
  if (!Number.isFinite(amountSol) || amountSol <= 0) {
    throw new Error("invalid_campaign_price");
  }

  const lamports = Math.round(amountSol * 1_000_000_000);
  if (!Number.isFinite(lamports) || lamports <= 0) {
    throw new Error("invalid_campaign_price");
  }

  return {
    quotedAmountSol: amountSol.toFixed(6),
    quotedAmountLamports: lamports,
  };
}

async function preflightOnchainPurchase(input: OnchainPurchaseInput): Promise<{
  campaignOnchainAddress: string;
  clubOnchainAddress: string;
  ownerTreasury: string;
  rpcUrl: string;
  programId: string;
  platformConfigPda: string;
  platformTreasury: string;
}> {
  assertValidWalletAddress(input.buyerWallet);
  const campaignOnchainAddress = getCampaignOnchainAddress(input.campaignId);
  const rpcUrl = getRequiredEnv("SOLNFT_RPC_URL");
  const programId = getRequiredEnv("SOLNFT_PROGRAM_ID");
  const platformTreasury = getRequiredEnv("SOLNFT_PLATFORM_TREASURY");

  const pointers = await loadCampaignPointersFromChain({
    rpcUrl,
    campaignOnchainAddress,
    programId,
  });

  return {
    campaignOnchainAddress,
    clubOnchainAddress: pointers.clubOnchainAddress,
    ownerTreasury: pointers.ownerTreasury,
    rpcUrl,
    programId,
    platformConfigPda: derivePlatformConfigPda(programId),
    platformTreasury,
  };
}

export async function purchaseMembershipOnchain(input: OnchainPurchaseInput): Promise<OnchainPurchaseResult> {
  const preflight = await preflightOnchainPurchase(input);
  const quote = getCampaignPriceQuote(input.campaignId);

  return {
    purchaseIntent: {
      kind: "onchain_purchase_intent",
      executionMode: "anchor_purchase_membership",
      campaignId: input.campaignId,
      campaignOnchainAddress: preflight.campaignOnchainAddress,
      clubOnchainAddress: preflight.clubOnchainAddress,
      buyerWallet: input.buyerWallet,
      ownerTreasury: preflight.ownerTreasury,
      quotedAmountSol: quote.quotedAmountSol,
      quotedAmountLamports: quote.quotedAmountLamports,
      rpcUrl: preflight.rpcUrl,
      programId: preflight.programId,
      platformConfigPda: preflight.platformConfigPda,
      platformTreasury: preflight.platformTreasury,
      suggestedCommitment: "confirmed",
    },
  };
}

export async function verifyOnchainPurchaseTx(input: {
  campaignId: string;
  buyerWallet: string;
  txSignature: string;
}): Promise<void> {
  const txSignature = input.txSignature.trim();
  if (!txSignature) {
    throw new Error("tx_signature_required");
  }

  const preflight = await preflightOnchainPurchase({
    campaignId: input.campaignId,
    buyerWallet: input.buyerWallet,
  });

  const connection = new Connection(preflight.rpcUrl, "confirmed");
  const parsed = await connection.getParsedTransaction(txSignature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!parsed) {
    throw new Error("onchain_tx_not_found");
  }

  if (parsed.meta?.err) {
    throw new Error("onchain_tx_failed");
  }

  const buyerSigner = parsed.transaction.message.accountKeys.find(
    (key) => key.pubkey.toBase58() === input.buyerWallet && key.signer
  );
  if (!buyerSigner) {
    throw new Error("onchain_tx_missing_buyer_signer");
  }

  const expectedPrefix = [
    input.buyerWallet,
    preflight.platformConfigPda,
    preflight.campaignOnchainAddress,
    preflight.clubOnchainAddress,
    preflight.platformTreasury,
    preflight.ownerTreasury,
  ];

  const found = parsed.transaction.message.instructions.some((ix) => {
    const programId = (ix as { programId?: unknown }).programId;
    if (!programId || String(programId) !== preflight.programId) {
      return false;
    }

    const candidate = ix as { accounts?: string[]; data?: string };
    if (!Array.isArray(candidate.accounts) || typeof candidate.data !== "string") {
      return false;
    }

    let decoded: Uint8Array;
    try {
      decoded = bs58.decode(candidate.data);
    } catch {
      return false;
    }

    if (decoded.length < 8) {
      return false;
    }

    for (let i = 0; i < 8; i += 1) {
      if (decoded[i] !== PURCHASE_MEMBERSHIP_DISCRIMINATOR[i]) {
        return false;
      }
    }

    for (let i = 0; i < expectedPrefix.length; i += 1) {
      if (candidate.accounts[i] !== expectedPrefix[i]) {
        return false;
      }
    }

    return true;
  });

  if (!found) {
    throw new Error("onchain_purchase_instruction_not_found");
  }

  const accountKeyMeta = parsed.transaction.message.accountKeys;
  const isWritable = (address: string): boolean => {
    const entry = accountKeyMeta.find((key) => key.pubkey.toBase58() === address);
    if (!entry) {
      throw new Error("onchain_tx_missing_expected_account");
    }
    return Boolean(entry.writable);
  };

  if (!isWritable(preflight.campaignOnchainAddress)) {
    throw new Error("onchain_tx_campaign_not_writable");
  }
  if (!isWritable(preflight.clubOnchainAddress)) {
    throw new Error("onchain_tx_club_not_writable");
  }
  if (!isWritable(preflight.platformTreasury)) {
    throw new Error("onchain_tx_platform_treasury_not_writable");
  }
  if (!isWritable(preflight.ownerTreasury)) {
    throw new Error("onchain_tx_owner_treasury_not_writable");
  }

  const expectedLamports = getCampaignPriceQuote(input.campaignId).quotedAmountLamports;
  const accountKeys = parsed.transaction.message.accountKeys.map((entry) => entry.pubkey.toBase58());
  const platformIndex = accountKeys.indexOf(preflight.platformTreasury);
  const ownerIndex = accountKeys.indexOf(preflight.ownerTreasury);

  if (platformIndex < 0 || ownerIndex < 0) {
    throw new Error("onchain_tx_missing_treasury_accounts");
  }

  const preBalances = parsed.meta?.preBalances;
  const postBalances = parsed.meta?.postBalances;
  if (!preBalances || !postBalances) {
    throw new Error("onchain_tx_missing_balances");
  }

  const platformDelta = postBalances[platformIndex] - preBalances[platformIndex];
  const ownerDelta = postBalances[ownerIndex] - preBalances[ownerIndex];
  if (platformDelta < 0 || ownerDelta < 0) {
    throw new Error("onchain_tx_invalid_balance_delta");
  }

  const paidLamports = platformDelta + ownerDelta;
  if (paidLamports !== expectedLamports) {
    throw new Error("onchain_tx_amount_mismatch");
  }
}

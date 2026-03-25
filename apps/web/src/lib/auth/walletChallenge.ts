import bs58 from "bs58";
import nacl from "tweetnacl";

type WalletChallenge = {
  wallet: string;
  nonce: string;
  message: string;
  expiresAtUnix: number;
};

type GlobalWithChallenges = typeof globalThis & {
  __proofmembershipChallenges?: Map<string, WalletChallenge>;
};

const CHALLENGE_TTL_SECONDS = 60 * 5;

function challengeStore(): Map<string, WalletChallenge> {
  const globalObj = globalThis as GlobalWithChallenges;
  if (!globalObj.__proofmembershipChallenges) {
    // Challenges stay in memory for the current single-instance app flow. If auth moves behind
    // multiple web instances, this store will need to be replaced with shared persistence.
    globalObj.__proofmembershipChallenges = new Map<string, WalletChallenge>();
  }
  return globalObj.__proofmembershipChallenges;
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function randomNonce(): string {
  const bytes = nacl.randomBytes(24);
  return Buffer.from(bytes).toString("hex");
}

function assertWallet(wallet: string): void {
  let decoded: Uint8Array;
  try {
    decoded = bs58.decode(wallet);
  } catch {
    throw new Error("invalid_wallet");
  }

  if (decoded.length !== 32) {
    throw new Error("invalid_wallet");
  }
}

function buildChallengeMessage(wallet: string, nonce: string): string {
  // Message format intentionally mirrors SIWS-style fields so wallet prompts
  // remain understandable while still binding nonce/domain/chain metadata.
  const domain = process.env.PROOFMEMBERSHIP_AUTH_DOMAIN ?? "localhost";
  const uri = process.env.PROOFMEMBERSHIP_AUTH_URI ?? "http://localhost:3000";
  const chain = process.env.PROOFMEMBERSHIP_CHAIN_ID ?? "solana:devnet";
  const issuedAt = new Date().toISOString();

  return [
    `${domain} wants you to sign in with your Solana account:`,
    wallet,
    "",
    "Sign this message to authenticate with ProofMembership.",
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chain}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

export function createWalletChallenge(wallet: string): WalletChallenge {
  const normalizedWallet = wallet.trim();
  assertWallet(normalizedWallet);

  const nonce = randomNonce();
  const message = buildChallengeMessage(normalizedWallet, nonce);
  const challenge: WalletChallenge = {
    wallet: normalizedWallet,
    nonce,
    message,
    expiresAtUnix: nowUnix() + CHALLENGE_TTL_SECONDS,
  };

  challengeStore().set(nonce, challenge);
  return challenge;
}

export function verifyWalletSignature(input: {
  wallet: string;
  nonce: string;
  message: string;
  signature: string;
}): void {
  const challenge = challengeStore().get(input.nonce);
  if (!challenge) {
    throw new Error("challenge_not_found");
  }

  // One-time nonce usage prevents replay even if a signed message leaks.
  challengeStore().delete(input.nonce);

  if (challenge.expiresAtUnix < nowUnix()) {
    throw new Error("challenge_expired");
  }

  if (challenge.wallet !== input.wallet.trim()) {
    throw new Error("wallet_mismatch");
  }

  if (challenge.message !== input.message) {
    throw new Error("message_mismatch");
  }

  let signature: Uint8Array;
  let publicKey: Uint8Array;
  try {
    signature = bs58.decode(input.signature.trim());
    publicKey = bs58.decode(input.wallet.trim());
  } catch {
    throw new Error("invalid_signature");
  }

  if (signature.length !== nacl.sign.signatureLength || publicKey.length !== nacl.sign.publicKeyLength) {
    throw new Error("invalid_signature");
  }

  const valid = nacl.sign.detached.verify(Buffer.from(input.message, "utf8"), signature, publicKey);
  if (!valid) {
    throw new Error("invalid_signature");
  }
}

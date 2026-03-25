/**
 * Solana provider types
 */

export type SolanaSignResult = Uint8Array | { signature: Uint8Array };

export type SolanaSendResult = { signature: string } | string;

export type SolanaProvider = {
  publicKey?: { toBase58(): string };
  connect?: () => Promise<{ publicKey: { toBase58(): string } }>;
  disconnect?: () => Promise<void>;
  signMessage?: (message: Uint8Array, display?: "utf8" | "hex") => Promise<SolanaSignResult>;
  signAndSendTransaction?: (transaction: unknown, options?: { preflightCommitment?: string }) => Promise<SolanaSendResult>;
};

// Type-safe provider variants for specific use cases
export type SolanaProviderWithSignMessage = SolanaProvider & {
  connect: () => Promise<{ publicKey: { toBase58(): string } }>;
  signMessage: (message: Uint8Array, display?: "utf8" | "hex") => Promise<SolanaSignResult>;
};

export type SolanaProviderWithSignAndSend = SolanaProvider & {
  signAndSendTransaction: (transaction: unknown, options?: { preflightCommitment?: string }) => Promise<SolanaSendResult>;
};


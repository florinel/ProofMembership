"use client";

import bs58 from "bs58";
import Link from "next/link";
import { useMemo, useState } from "react";

import { clearWalletSession, createWalletChallenge, verifyWalletSession } from "@/lib/auth/session";

type SessionRole = "public" | "member" | "owner" | "admin";

type SolanaSignResult = Uint8Array | { signature: Uint8Array };

type SolanaProvider = {
  publicKey?: { toBase58(): string };
  connect: () => Promise<{ publicKey: { toBase58(): string } }>;
  disconnect?: () => Promise<void>;
  signMessage?: (message: Uint8Array, display?: "utf8" | "hex") => Promise<SolanaSignResult>;
};

declare global {
  interface Window {
    solana?: SolanaProvider;
  }
}

export default function WalletConnectClient() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [role, setRole] = useState<SessionRole | null>(null);
  const [status, setStatus] = useState("Connect your Solana wallet to create a signed SolNFT session.");

  const walletShort = useMemo(() => {
    if (!wallet) {
      return null;
    }

    if (wallet.length <= 10) {
      return wallet;
    }

    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }, [wallet]);

  function getProvider(): SolanaProvider {
    if (typeof window === "undefined" || !window.solana) {
      throw new Error("No browser wallet found. Install Phantom or another Solana wallet extension.");
    }

    if (typeof window.solana.signMessage !== "function") {
      throw new Error("Wallet does not support signMessage.");
    }

    return window.solana;
  }

  async function connectAndSignIn() {
    try {
      setStatus("Connecting wallet...");
      const provider = getProvider();
      const connected = await provider.connect();
      const connectedWallet = connected.publicKey.toBase58();
      setWallet(connectedWallet);

      setStatus("Requesting challenge...");
      const challenge = await createWalletChallenge(connectedWallet);
      const messageBytes = new TextEncoder().encode(challenge.message);

      setStatus("Please approve message signature in your wallet...");
      const signed = await provider.signMessage!(messageBytes, "utf8");
      const signatureBytes = signed instanceof Uint8Array ? signed : signed.signature;
      const signature = bs58.encode(signatureBytes);

      setStatus("Verifying signature and creating session...");
      const verified = await verifyWalletSession({
        wallet: connectedWallet,
        nonce: challenge.nonce,
        message: challenge.message,
        signature,
      });

      setWallet(verified.wallet);
      setRole(verified.role);
      setStatus(`Signed in as ${verified.role}. You can now test owner and storefront routes with this wallet session.`);
    } catch (error) {
      setRole(null);
      const message = error instanceof Error ? error.message : "Wallet sign-in failed";
      setStatus(`Wallet sign-in failed: ${message}`);
    }
  }

  async function logout() {
    try {
      await clearWalletSession();
      const provider = typeof window !== "undefined" ? window.solana : undefined;
      if (provider?.disconnect) {
        await provider.disconnect();
      }
      setRole(null);
      setWallet(null);
      setStatus("Signed out. Session cookie cleared.");
    } catch {
      setStatus("Failed to clear wallet session.");
    }
  }

  return (
    <section className="panel stack-sm">
      <h3>Wallet Session</h3>
      <p>{wallet ? `Connected wallet: ${wallet}` : "No wallet connected yet."}</p>
      <p>{role ? `Resolved role: ${role}` : "Resolved role: (not signed in)"}</p>
      <div className="wallet-actions">
        <button className="btn-primary" type="button" onClick={() => void connectAndSignIn()}>
          Connect Wallet and Sign In
        </button>
        <button className="btn-secondary" type="button" onClick={() => void logout()}>
          Sign Out
        </button>
      </div>
      <p className="kicker">Quick links after sign-in: <Link href="/owner">Owner</Link> | <Link href="/storefront">Storefront</Link> | <Link href="/admin">Admin</Link></p>
      <p>{status}</p>
      {walletShort ? <p className="kicker">Active wallet: {walletShort}</p> : null}
    </section>
  );
}

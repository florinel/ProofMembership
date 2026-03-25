"use client";

import React from "react";
import { Buffer } from "buffer";
import { useEffect, useMemo, useState } from "react";

import type { Campaign, Membership } from "@proofmembership/types";
import type { OnchainPurchaseIntent } from "@/lib/chain/purchase";

function formatExpiry(expiresAtUnix: number | null): string {
  if (!expiresAtUnix) {
    return "Never expires";
  }
  return `Valid until ${new Date(expiresAtUnix * 1000).toISOString().slice(0, 10)}`;
}

type StorefrontFlowClientProps = {
  initialWallet?: string;
};

type PurchaseConfirmResponse = {
  error?: string;
  membership?: Membership;
};

export default function StorefrontFlowClient({ initialWallet }: StorefrontFlowClientProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [wallet, setWallet] = useState(initialWallet ?? "member-wallet-1");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    if (initialWallet) {
      setWallet(initialWallet);
      setStatus("Buyer wallet loaded from connected wallet session.");
    }
  }, [initialWallet]);

  async function loadCampaigns() {
    const clubsResponse = await fetch("/api/clubs");
    const clubs = (await clubsResponse.json()) as Array<{ id: string }>;

    const allCampaigns: Campaign[] = [];
    for (const club of clubs) {
      const response = await fetch(`/api/clubs/${club.id}/campaigns`);
      const byClub = (await response.json()) as Campaign[];
      allCampaigns.push(...byClub);
    }

    setCampaigns(allCampaigns);
  }

  async function loadMemberships(targetWallet: string) {
    const response = await fetch(`/api/memberships/${encodeURIComponent(targetWallet)}`);
    const data = (await response.json()) as Membership[];
    setMemberships(data);
  }

  async function submitOnchainPurchaseIntent(intent: OnchainPurchaseIntent): Promise<string> {
    if (typeof window === "undefined" || !window.solana) {
      throw new Error("wallet_provider_not_found");
    }

    const provider = window.solana;
    if (typeof provider.signAndSendTransaction !== "function") {
      throw new Error("wallet_does_not_support_sign_and_send");
    }

    const connected = provider.publicKey
      ? { publicKey: provider.publicKey }
      : (typeof provider.connect === "function" ? await provider.connect() : null);
    const connectedWallet = connected?.publicKey.toBase58();

    if (!connectedWallet) {
      throw new Error("wallet_not_connected");
    }

    if (connectedWallet !== intent.buyerWallet) {
      throw new Error("wallet_mismatch_for_purchase");
    }

    const web3 = await import("@solana/web3.js");
    const purchaseDiscriminator = Uint8Array.from([0xe2, 0x38, 0x0e, 0xdc, 0x68, 0x46, 0x00, 0xe1]);
    const tokenProgramId = new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const associatedTokenProgramId = new web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    const systemProgramId = web3.SystemProgram.programId;

    const buyerPubkey = new web3.PublicKey(intent.buyerWallet);
    const campaignPubkey = new web3.PublicKey(intent.campaignOnchainAddress);
    const clubPubkey = new web3.PublicKey(intent.clubOnchainAddress);
    const platformConfigPda = new web3.PublicKey(intent.platformConfigPda);
    const platformTreasury = new web3.PublicKey(intent.platformTreasury);
    const ownerTreasury = new web3.PublicKey(intent.ownerTreasury);
    const programId = new web3.PublicKey(intent.programId);

    const nftMintKeypair = web3.Keypair.generate();
    const nftMintPubkey = nftMintKeypair.publicKey;

    const [buyerNftTokenAccount] = web3.PublicKey.findProgramAddressSync(
      [
        buyerPubkey.toBuffer(),
        tokenProgramId.toBuffer(),
        nftMintPubkey.toBuffer(),
      ],
      associatedTokenProgramId
    );

    const [membershipPda] = web3.PublicKey.findProgramAddressSync(
      [
        new TextEncoder().encode("membership"),
        campaignPubkey.toBuffer(),
        buyerPubkey.toBuffer(),
        nftMintPubkey.toBuffer(),
      ],
      programId
    );

    const connection = new web3.Connection(intent.rpcUrl, intent.suggestedCommitment);
    const latest = await connection.getLatestBlockhash(intent.suggestedCommitment);

    const transaction = new web3.Transaction({
      feePayer: buyerPubkey,
      recentBlockhash: latest.blockhash,
    }).add(new web3.TransactionInstruction({
      programId,
      keys: [
        { pubkey: buyerPubkey, isSigner: true, isWritable: true },
        { pubkey: platformConfigPda, isSigner: false, isWritable: false },
        { pubkey: campaignPubkey, isSigner: false, isWritable: true },
        { pubkey: clubPubkey, isSigner: false, isWritable: true },
        { pubkey: platformTreasury, isSigner: false, isWritable: true },
        { pubkey: ownerTreasury, isSigner: false, isWritable: true },
        { pubkey: nftMintPubkey, isSigner: true, isWritable: true },
        { pubkey: buyerNftTokenAccount, isSigner: false, isWritable: true },
        { pubkey: membershipPda, isSigner: false, isWritable: true },
        { pubkey: tokenProgramId, isSigner: false, isWritable: false },
        { pubkey: associatedTokenProgramId, isSigner: false, isWritable: false },
        { pubkey: systemProgramId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(purchaseDiscriminator),
    }));

    transaction.partialSign(nftMintKeypair);

    const sent = await provider.signAndSendTransaction(transaction, {
      preflightCommitment: intent.suggestedCommitment,
    });
    const signature = typeof sent === "string" ? sent : sent.signature;
    if (!signature) {
      throw new Error("wallet_submission_failed");
    }

    await connection.confirmTransaction(
      {
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      intent.suggestedCommitment
    );

    return signature;
  }

  async function buy(campaignId: string) {
    setStatus("Processing purchase...");

    const response = await fetch("/api/storefront/purchase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campaignId, buyerWallet: wallet }),
    });

    const data = (await response.json()) as {
      error?: string;
      membership?: Membership;
      purchaseIntent?: OnchainPurchaseIntent;
      mode?: "local" | "onchain";
    };
    if (!response.ok) {
      setStatus(`Purchase failed: ${data.error ?? "unknown"}`);
      return;
    }

    if (response.status === 202 && data.purchaseIntent) {
      setStatus("On-chain purchase intent received. Opening wallet confirmation...");
      try {
        const signature = await submitOnchainPurchaseIntent(data.purchaseIntent);
        const confirmResponse = await fetch("/api/storefront/purchase/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            campaignId,
            buyerWallet: wallet,
            txSignature: signature,
          }),
        });
        const confirmData = (await confirmResponse.json()) as PurchaseConfirmResponse;
        if (!confirmResponse.ok) {
          setStatus(`On-chain transfer confirmed (${signature}) but projection failed: ${confirmData.error ?? "unknown"}`);
          return;
        }

        setStatus(`On-chain purchase projected: ${confirmData.membership?.id ?? signature}`);
        await loadCampaigns();
        await loadMemberships(wallet);
      } catch (submitError) {
        const submitMessage = submitError instanceof Error ? submitError.message : "wallet_submission_failed";
        setStatus(`On-chain submission failed: ${submitMessage}`);
      }
      return;
    }

    setStatus(`Membership purchased: ${data.membership?.id ?? "ok"}`);
    await loadCampaigns();
    await loadMemberships(wallet);
  }

  useEffect(() => {
    void loadCampaigns();
    void loadMemberships(wallet);
  }, [wallet]);

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "active"),
    [campaigns]
  );

  return (
    <>
      <div className="panel form-grid">
        <label>
          Buyer wallet
          <input
            type="text"
            value={wallet}
            onChange={(event) => setWallet(event.target.value)}
            placeholder="member-wallet-1"
          />
        </label>
        {initialWallet ? <p className="kicker">Using connected wallet session as default buyer wallet.</p> : null}
        <button type="button" className="btn-primary" onClick={() => void loadMemberships(wallet)}>Load memberships</button>
      </div>

      <div className="stats-grid">
        {activeCampaigns.map((campaign) => (
          <section key={campaign.id} className="panel">
            <h3>{campaign.name}</h3>
            <p>
              {campaign.priceAtomic} SOL
            </p>
            <p>{formatExpiry(campaign.expiresAtUnix)}</p>
            <p>
              Supply: {campaign.maxSupply ? `${campaign.mintedSupply}/${campaign.maxSupply}` : "Unlimited"}
            </p>
            <button type="button" className="btn-primary" onClick={() => void buy(campaign.id)}>Buy membership</button>
          </section>
        ))}
      </div>

      <div className="panel">
        <h3>My memberships</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Membership</th>
              <th>Asset</th>
              <th>Campaign</th>
              <th>Validity</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((membership) => (
              <tr key={membership.id}>
                <td>{membership.nftMint}</td>
                <td>
                  {membership.assetId && membership.metadataUri ? (
                    <a href={membership.metadataUri} target="_blank" rel="noreferrer">
                      {membership.assetId}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{membership.campaignId}</td>
                <td>{formatExpiry(membership.expiresAtUnix)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <p>{status}</p>
      </div>
    </>
  );
}

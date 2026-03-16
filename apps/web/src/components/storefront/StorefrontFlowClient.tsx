"use client";

import { useEffect, useMemo, useState } from "react";

import type { Campaign, Membership } from "@solnft/types";

function formatExpiry(expiresAtUnix: number | null): string {
  if (!expiresAtUnix) {
    return "Never expires";
  }
  return `Valid until ${new Date(expiresAtUnix * 1000).toISOString().slice(0, 10)}`;
}

export default function StorefrontFlowClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [wallet, setWallet] = useState("member-wallet-1");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [status, setStatus] = useState("Ready");

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

  async function buy(campaignId: string) {
    setStatus("Processing purchase...");

    const response = await fetch("/api/storefront/purchase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campaignId, buyerWallet: wallet }),
    });

    const data = (await response.json()) as { error?: string; membership?: Membership };
    if (!response.ok) {
      setStatus(`Purchase failed: ${data.error ?? "unknown"}`);
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
        <button type="button" className="btn-primary" onClick={() => void loadMemberships(wallet)}>Load memberships</button>
      </div>

      <div className="stats-grid">
        {activeCampaigns.map((campaign) => (
          <section key={campaign.id} className="panel">
            <h3>{campaign.name}</h3>
            <p>
              {campaign.priceAtomic} {campaign.paymentToken}
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

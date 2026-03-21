"use client";

import { FormEvent, useState } from "react";

type AdminOverviewResponse = {
  owners: number;
  clubs: number;
  campaigns: number;
  activeCampaigns: number;
  incomingDepositsAtomic: string;
  platformBalanceAtomic: string;
  config: {
    initialized: boolean;
    clubCreationFee: number;
    campaignCreationFee: number;
    defaultCampaignFeeBps: number;
    defaultMinCampaignFeeAtomic: string;
  };
};

type ClubResponse = {
  id: string;
  slug: string;
  ownerWallet: string;
  metadataUri: string;
};

export default function AdminFlowClient() {
  const [status, setStatus] = useState("Ready");
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);

  async function refreshOverview() {
    const response = await fetch("/api/admin/overview");
    const data = (await response.json()) as AdminOverviewResponse;
    setOverview(data);
  }

  async function initializePlatform(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Initializing platform...");

    const response = await fetch("/api/admin/platform/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clubCreationFee: Number(form.get("clubCreationFee") ?? 1),
        campaignCreationFee: Number(form.get("campaignCreationFee") ?? 0.5),
        defaultCampaignFeeBps: Number(form.get("defaultCampaignFeeBps") ?? 200),
        defaultMinCampaignFeeAtomic: String(form.get("defaultMinCampaignFeeAtomic") ?? "0.0003"),
      }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(`Initialize failed: ${result.error ?? "unknown"}`);
      return;
    }

    setStatus("Platform initialized.");
    await refreshOverview();
  }

  async function updateClubFeePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const clubId = String(form.get("clubId") ?? "").trim();
    if (!clubId) {
      setStatus("Club ID is required.");
      return;
    }

    setStatus("Updating club fee policy...");
    const response = await fetch(`/api/admin/clubs/${encodeURIComponent(clubId)}/fee-policy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campaignFeeBps: Number(form.get("campaignFeeBps") ?? 200),
        minCampaignFeeAtomic: String(form.get("minCampaignFeeAtomic") ?? "0.0003"),
      }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(`Update fee policy failed: ${result.error ?? "unknown"}`);
      return;
    }

    setStatus("Club fee policy updated.");
  }

  async function createClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Creating club...");

    const response = await fetch("/api/admin/clubs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: String(form.get("slug") ?? ""),
        ownerWallet: String(form.get("ownerWallet") ?? ""),
        metadataUri: String(form.get("metadataUri") ?? ""),
        feePaid: Number(form.get("feePaid") ?? 0),
      }),
    });

    const result = (await response.json()) as { error?: string; club?: ClubResponse };
    if (!response.ok) {
      setStatus(`Create club failed: ${result.error ?? "unknown"}`);
      return;
    }

    setStatus(`Created club ${result.club?.slug ?? ""}. Reload /admin to see it in table.`);
    await refreshOverview();
  }

  return (
    <div className="stats-grid">
      <section className="panel">
        <h3>Initialize Platform</h3>
        <form className="form-grid" onSubmit={initializePlatform}>
          <label>
            Club creation fee
            <input name="clubCreationFee" type="number" defaultValue="1" step="0.01" min="0.01" />
          </label>
          <label>
            Campaign creation fee
            <input name="campaignCreationFee" type="number" defaultValue="0.5" step="0.01" min="0" />
          </label>
          <label>
            Default campaign fee BPS
            <input name="defaultCampaignFeeBps" type="number" defaultValue="200" min="0" max="10000" />
          </label>
          <label>
            Default minimum campaign fee (SOL)
            <input name="defaultMinCampaignFeeAtomic" type="number" defaultValue="0.0003" step="0.000001" min="0" />
          </label>
          <button className="btn-primary" type="submit">Initialize</button>
        </form>
      </section>

      <section className="panel">
        <h3>Create Club</h3>
        <form className="form-grid" onSubmit={createClub}>
          <label>
            Club slug
            <input name="slug" type="text" placeholder="elite-surf-club" />
          </label>
          <label>
            Club owner wallet
            <input name="ownerWallet" type="text" placeholder="OwnerWallet111" />
          </label>
          <label>
            Metadata URI
            <input name="metadataUri" type="text" placeholder="https://example.com/club.json" />
          </label>
          <label>
            Fee paid
            <input name="feePaid" type="number" step="0.01" defaultValue="1" />
          </label>
          <button className="btn-primary" type="submit">Create Club</button>
        </form>
      </section>

      <section className="panel">
        <h3>Update Club Fee Policy</h3>
        <form className="form-grid" onSubmit={updateClubFeePolicy}>
          <label>
            Club ID
            <input name="clubId" type="text" placeholder="club-..." />
          </label>
          <label>
            Campaign fee BPS
            <input name="campaignFeeBps" type="number" defaultValue="200" min="0" max="10000" />
          </label>
          <label>
            Minimum campaign fee (SOL)
            <input name="minCampaignFeeAtomic" type="number" defaultValue="0.0003" step="0.000001" min="0" />
          </label>
          <button className="btn-primary" type="submit">Update Club Fees</button>
        </form>
      </section>

      <section className="panel">
        <h3>Flow Status</h3>
        <p>{status}</p>
        <button className="btn-primary" type="button" onClick={refreshOverview}>Refresh Overview</button>
        {overview ? (
          <div className="stack-sm">
            <p>Initialized: {String(overview.config.initialized)}</p>
            <p>Club Fee: {overview.config.clubCreationFee}</p>
            <p>Campaign Fee: {overview.config.campaignCreationFee}</p>
            <p>Default Campaign BPS: {overview.config.defaultCampaignFeeBps}</p>
            <p>Default Min Campaign Fee: {overview.config.defaultMinCampaignFeeAtomic} SOL</p>
            <p>Platform Balance: {overview.platformBalanceAtomic}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

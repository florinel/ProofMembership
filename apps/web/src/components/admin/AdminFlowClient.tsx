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
    campaignFeeBps: number;
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
        campaignFeeBps: Number(form.get("campaignFeeBps") ?? 500),
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
            Campaign fee BPS
            <input name="campaignFeeBps" type="number" defaultValue="500" min="0" max="10000" />
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
        <h3>Flow Status</h3>
        <p>{status}</p>
        <button className="btn-primary" type="button" onClick={refreshOverview}>Refresh Overview</button>
        {overview ? (
          <div className="stack-sm">
            <p>Initialized: {String(overview.config.initialized)}</p>
            <p>Club Fee: {overview.config.clubCreationFee}</p>
            <p>Campaign Fee: {overview.config.campaignCreationFee}</p>
            <p>Platform Balance: {overview.platformBalanceAtomic}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

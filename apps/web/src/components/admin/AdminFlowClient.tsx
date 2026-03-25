"use client";

import { FormEvent, useState } from "react";

type AdminOverviewResponse = {
  approvedOwners: number;
  pendingOwnerApplications: number;
  owners: number;
  clubs: number;
  campaigns: number;
  activeCampaigns: number;
  incomingDepositsAtomic: string;
  platformBalanceAtomic: string;
  config: {
    initialized: boolean;
    ownerApprovalFee: number;
    clubCreationFee: number;
    campaignCreationFee: number;
    defaultCampaignFeeBps: number;
    defaultMinCampaignFeeAtomic: string;
  };
};

type OwnerApplicationResponse = {
  id: string;
  wallet: string;
  description: string;
  status: "pending" | "approved" | "rejected";
};

export default function AdminFlowClient() {
  const [status, setStatus] = useState("Ready");
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [pendingApplications, setPendingApplications] = useState<OwnerApplicationResponse[]>([]);

  async function refreshOverview() {
    const [overviewResponse, applicationsResponse] = await Promise.all([
      fetch("/api/admin/overview"),
      fetch("/api/admin/owner-applications"),
    ]);

    const overviewData = (await overviewResponse.json()) as AdminOverviewResponse;
    const applicationsData = (await applicationsResponse.json()) as {
      pending?: OwnerApplicationResponse[];
    };

    setOverview(overviewData);
    setPendingApplications(applicationsData.pending ?? []);
  }

  async function initializePlatform(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Initializing platform...");

    const response = await fetch("/api/admin/platform/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerApprovalFee: Number(form.get("ownerApprovalFee") ?? 0.5),
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

  async function approveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const applicationId = String(form.get("applicationId") ?? "").trim();
    if (!applicationId) {
      setStatus("Application ID is required.");
      return;
    }

    setStatus("Approving owner application...");

    const response = await fetch(`/api/admin/owner-applications/${encodeURIComponent(applicationId)}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        feePaid: Number(form.get("feePaid") ?? 0),
      }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(`Owner approval failed: ${result.error ?? "unknown"}`);
      return;
    }

    setStatus("Owner application approved.");
    await refreshOverview();
  }

  return (
    <div className="stats-grid">
      <section className="panel">
        <h3>Initialize Platform</h3>
        <form className="form-grid" onSubmit={initializePlatform}>
          <label>
            Owner approval fee
            <input name="ownerApprovalFee" type="number" defaultValue="0.5" step="0.01" min="0" />
          </label>
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
        <h3>Approve Owner Application</h3>
        <form className="form-grid" onSubmit={approveApplication}>
          <label>
            Application ID
            <input name="applicationId" type="text" placeholder="oapp-..." />
          </label>
          <label>
            Fee paid
            <input name="feePaid" type="number" step="0.01" defaultValue="0.5" min="0" />
          </label>
          <button className="btn-primary" type="submit">Approve Application</button>
        </form>
        {pendingApplications.length ? (
          <div className="stack-sm">
            <p><strong>Pending applications</strong></p>
            {pendingApplications.map((application) => (
              <p key={application.id}>
                {application.id} | {application.wallet} | {application.description}
              </p>
            ))}
          </div>
        ) : (
          <p>No pending owner applications.</p>
        )}
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
            <p>Owner approval fee: {overview.config.ownerApprovalFee}</p>
            <p>Club Fee: {overview.config.clubCreationFee}</p>
            <p>Campaign Fee: {overview.config.campaignCreationFee}</p>
            <p>Default Campaign BPS: {overview.config.defaultCampaignFeeBps}</p>
            <p>Default Min Campaign Fee: {overview.config.defaultMinCampaignFeeAtomic} SOL</p>
            <p>Approved owners: {overview.approvedOwners}</p>
            <p>Pending owner applications: {overview.pendingOwnerApplications}</p>
            <p>Platform Balance: {overview.platformBalanceAtomic}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

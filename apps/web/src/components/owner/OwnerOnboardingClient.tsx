"use client";

import React from "react";
import { FormEvent, useState } from "react";

type OwnerApplicationStatus = {
  id: string;
  status: "pending" | "approved" | "rejected";
  settlementStatus: "pending_settlement" | "settled_to_admin" | "returned_to_applicant";
  settlementAmountAtomic: string;
  submitEscrowTxSignature: string | null;
  approvalSettlementTxSignature: string | null;
  refundSettlementTxSignature: string | null;
  createdAtUnix: number;
  reviewedAtUnix: number | null;
  reviewNote: string | null;
};

type OwnerApplicationStatusResponse = {
  ok: boolean;
  wallet: string;
  approvedOwner: boolean;
  application: OwnerApplicationStatus | null;
};

export default function OwnerOnboardingClient({
  initialWallet,
  canCreateClub = true,
  showApplication = true,
}: {
  initialWallet?: string;
  canCreateClub?: boolean;
  showApplication?: boolean;
}) {
  const [status, setStatus] = useState("Ready");
  const [wallet, setWallet] = useState(initialWallet ?? "");
  const [applicationStatus, setApplicationStatus] = useState<OwnerApplicationStatusResponse | null>(null);

  async function checkApplicationStatus() {
    const trimmedWallet = wallet.trim();
    if (!trimmedWallet) {
      setStatus("Enter a wallet to check owner application status.");
      setApplicationStatus(null);
      return;
    }

    setStatus("Checking application status...");
    const response = await fetch(`/api/owner-applications?wallet=${encodeURIComponent(trimmedWallet)}`);
    const result = (await response.json()) as OwnerApplicationStatusResponse | { error?: string };
    if (!response.ok) {
      setStatus(`Status check failed: ${(result as { error?: string }).error ?? "unknown"}`);
      return;
    }

    const payload = result as OwnerApplicationStatusResponse;
    setApplicationStatus(payload);

    if (payload.approvedOwner) {
      setStatus("Owner approved. Sign in again with this wallet to access /owner.");
      return;
    }

    if (!payload.application) {
      setStatus("No owner application found for this wallet.");
      return;
    }

    if (payload.application.status === "pending") {
      setStatus("Application is pending admin review.");
      return;
    }

    if (payload.application.status === "rejected") {
      setStatus("Application was rejected. Review notes are shown below.");
      return;
    }

    setStatus("Application approved. Sign in again with this wallet to access /owner.");
  }

  async function applyForOwnerAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setStatus("Submitting owner application...");
    const response = await fetch("/api/owner-applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        wallet: wallet.trim(),
        description: String(form.get("description") ?? "").trim(),
      }),
    });

    const result = (await response.json()) as { error?: string; application?: { id: string } };
    if (!response.ok) {
      setStatus(`Owner application failed: ${result.error ?? "unknown"}`);
      return;
    }

    setApplicationStatus(null);
    setStatus(`Owner application submitted: ${result.application?.id ?? "ok"}`);
  }

  async function createClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setStatus("Creating club...");
    const response = await fetch("/api/owner/clubs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerWallet: wallet.trim(),
        slug: String(form.get("slug") ?? "").trim(),
        metadataUri: String(form.get("metadataUri") ?? "").trim(),
        feePaid: Number(form.get("feePaid") ?? 0),
      }),
    });

    const result = (await response.json()) as { error?: string; club?: { id: string; slug: string } };
    if (!response.ok) {
      setStatus(`Create club failed: ${result.error ?? "unknown"}`);
      return;
    }

    setStatus(`Club created: ${result.club?.slug ?? result.club?.id ?? "ok"}`);
  }

  return (
    <div className="stats-grid">
      {showApplication ? (
        <section className="panel">
          <h3>Apply for Club Ownership</h3>
          <form className="form-grid" onSubmit={applyForOwnerAccess}>
            <label>
              Wallet
              <input
                name="wallet"
                type="text"
                placeholder="OwnerWallet111"
                value={wallet}
                onChange={(event) => {
                  setWallet(event.target.value);
                  setApplicationStatus(null);
                }}
              />
            </label>
            {initialWallet ? <p className="kicker">Prefilled from your current session. You can replace it to simulate another owner wallet.</p> : null}
            <button className="btn-secondary" type="button" onClick={checkApplicationStatus}>Check Status</button>
            <label>
              Club description
              <textarea name="description" placeholder="Describe your community (for example: sports membership club, rotary club, event series, fan membership, or alumni network) and membership plan." rows={4} />
            </label>
            <button className="btn-primary" type="submit">Submit Application</button>
          </form>
        </section>
      ) : null}

      {canCreateClub ? (
        <section className="panel">
          <h3>Create Club</h3>
          <p>Available after admin approval and owner onboarding fee payment.</p>
          <form className="form-grid" onSubmit={createClub}>
            <label>
              Approved owner wallet
              <input
                name="ownerWallet"
                type="text"
                placeholder="OwnerWallet111"
                value={wallet}
                onChange={(event) => setWallet(event.target.value)}
              />
            </label>
            <label>
              Club slug
              <input name="slug" type="text" placeholder="golden-greens" />
            </label>
            <label>
              Club metadata URI
              <input name="metadataUri" type="text" placeholder="https://example.com/club.json" />
            </label>
            <label>
              Club creation fee paid
              <input name="feePaid" type="number" min="0" step="0.01" defaultValue="1" />
            </label>
            <button className="btn-primary" type="submit">Create Club</button>
          </form>
        </section>
      ) : (
        <section className="panel">
          <h3>Create Club</h3>
          <p>Club creation is unlocked after admin approval and onboarding fee collection.</p>
        </section>
      )}

      <section className="panel">
        <h3>Status</h3>
        <p>{status}</p>
        {applicationStatus ? (
          <div className="stack-sm">
            <p>Wallet: {applicationStatus.wallet}</p>
            <p>Approved owner: {String(applicationStatus.approvedOwner)}</p>
            {applicationStatus.application ? (
              <>
                <p>Application ID: {applicationStatus.application.id}</p>
                <p>Application status: {applicationStatus.application.status}</p>
                <p>Settlement status: {applicationStatus.application.settlementStatus}</p>
                <p>Settlement amount (policy): {applicationStatus.application.settlementAmountAtomic} SOL</p>
                {applicationStatus.application.submitEscrowTxSignature ? (
                  <p>Escrow deposit tx: {applicationStatus.application.submitEscrowTxSignature}</p>
                ) : null}
                {applicationStatus.application.approvalSettlementTxSignature ? (
                  <p>Approval settlement tx: {applicationStatus.application.approvalSettlementTxSignature}</p>
                ) : null}
                {applicationStatus.application.refundSettlementTxSignature ? (
                  <p>Refund settlement tx: {applicationStatus.application.refundSettlementTxSignature}</p>
                ) : null}
                <p>Submitted at: {new Date(applicationStatus.application.createdAtUnix * 1000).toISOString()}</p>
                {applicationStatus.application.reviewedAtUnix ? (
                  <p>Reviewed at: {new Date(applicationStatus.application.reviewedAtUnix * 1000).toISOString()}</p>
                ) : null}
                {applicationStatus.application.reviewNote ? (
                  <p>Review note: {applicationStatus.application.reviewNote}</p>
                ) : null}
              </>
            ) : (
              <p>No application record yet for this wallet.</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

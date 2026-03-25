"use client";

import { FormEvent, useState } from "react";

export default function OwnerOnboardingClient({
  initialWallet,
  canCreateClub = true,
}: {
  initialWallet?: string;
  canCreateClub?: boolean;
}) {
  const [status, setStatus] = useState("Ready");
  const [wallet, setWallet] = useState(initialWallet ?? "");
  const walletLocked = Boolean(initialWallet);

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
              onChange={(event) => setWallet(event.target.value)}
              readOnly={walletLocked}
            />
          </label>
          <label>
            Club description
            <textarea name="description" placeholder="Describe your community (for example: sports membership club, rotary club, event series, fan membership, or alumni network) and membership plan." rows={4} />
          </label>
          <button className="btn-primary" type="submit">Submit Application</button>
        </form>
      </section>

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
                readOnly={walletLocked}
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
      </section>
    </div>
  );
}

"use client";

import React from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ClubSummary = {
  id: string;
  slug: string;
  ownerWallet: string;
  campaignFeeBps: number;
  minCampaignFeeAtomic: string;
};

type OwnerCampaignCreateClientProps = {
  initialOwnerWallet?: string;
  preselectedClubId?: string;
};

export default function OwnerCampaignCreateClient({ initialOwnerWallet, preselectedClubId }: OwnerCampaignCreateClientProps) {
  const [status, setStatus] = useState("Ready");
  const [ownerWallet, setOwnerWallet] = useState(initialOwnerWallet ?? "");
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [clubId, setClubId] = useState("");
  const [mintMode, setMintMode] = useState<"on_purchase" | "live_event">("on_purchase");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateImageUri, setTemplateImageUri] = useState("");
  const [priceAtomic, setPriceAtomic] = useState("5");
  const ownerWalletLocked = Boolean(initialOwnerWallet);

  useEffect(() => {
    if (initialOwnerWallet) {
      setOwnerWallet(initialOwnerWallet);
    }
  }, [initialOwnerWallet]);

  useEffect(() => {
    async function loadClubs() {
      const response = await fetch("/api/clubs");
      const data = (await response.json()) as ClubSummary[];
      setClubs(data);
    }

    void loadClubs();
  }, []);

  const ownerClubs = useMemo(
    // Keep the selectable club list derived from the entered owner wallet so the UI matches the
    // same ownership rule enforced by the API and persisted store.
    () => clubs.filter((club) => club.ownerWallet.toLowerCase() === ownerWallet.trim().toLowerCase()),
    [clubs, ownerWallet]
  );

  useEffect(() => {
    if (!ownerClubs.length) {
      setClubId("");
      return;
    }

    if (!clubId && preselectedClubId && ownerClubs.some((club) => club.id === preselectedClubId)) {
      setClubId(preselectedClubId);
      return;
    }

    if (!ownerClubs.some((club) => club.id === clubId)) {
      setClubId(ownerClubs[0].id);
    }
  }, [ownerClubs, clubId, preselectedClubId]);

  async function uploadTemplate(): Promise<void> {
    if (!templateFile) {
      setStatus("Select an image file first.");
      return;
    }

    setStatus("Uploading template image...");
    const form = new FormData();
    form.set("file", templateFile);

    const response = await fetch("/api/owner/template-upload", {
      method: "POST",
      body: form,
    });

    const data = (await response.json()) as {
      error?: string;
      mediaUri?: string;
      permanentUri?: string;
      storage?: "local" | "arweave";
    };
    if (!response.ok || !data.mediaUri) {
      setStatus(`Template upload failed: ${data.error ?? "unknown"}`);
      return;
    }

    setTemplateImageUri(data.mediaUri);
    const storageLabel = data.storage ? ` (${data.storage})` : "";
    const displayUri = data.permanentUri ?? data.mediaUri;
    setStatus(`Template uploaded${storageLabel}: ${displayUri}`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const expiryMode = String(form.get("expiryMode") ?? "indefinite");
    const endDate = String(form.get("endDate") ?? "");
    const expiresAtUnix = expiryMode === "fixed" && endDate
      ? Math.floor(new Date(`${endDate}T00:00:00Z`).getTime() / 1000)
      : null;

    const liveStartDateTime = String(form.get("liveStartDateTime") ?? "");
    const mintStartsAtUnix = mintMode === "live_event" && liveStartDateTime
      ? Math.floor(new Date(liveStartDateTime).getTime() / 1000)
      : null;

    if (!clubId) {
      setStatus("No owned club selected. Create a club first or use matching owner wallet.");
      return;
    }

    if (!templateImageUri) {
      setStatus("Upload or provide a template image URI before creating campaign.");
      return;
    }

    setStatus("Creating campaign...");

    const response = await fetch("/api/owner/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clubId,
        ownerWallet: ownerWallet.trim(),
        name: String(form.get("name") ?? ""),
        priceAtomic: String(form.get("priceAtomic") ?? ""),
        templateImageUri,
        mintMode,
        mintStartsAtUnix,
        maxSupply: Number(form.get("maxSupply") || 0) || null,
        expiresAtUnix,
      }),
    });

    const data = (await response.json()) as { error?: string; campaign?: { id: string; name: string } };

    if (!response.ok) {
      setStatus(`Create campaign failed: ${data.error ?? "unknown"}`);
      return;
    }

    setStatus(`Campaign created: ${data.campaign?.name ?? data.campaign?.id ?? "ok"}. Go to /storefront to purchase.`);
  }

  const selectedClub = ownerClubs.find((club) => club.id === clubId) ?? null;
  const parsedPrice = Number(priceAtomic);
  const minFee = Number(selectedClub?.minCampaignFeeAtomic ?? "0");
  const bps = selectedClub?.campaignFeeBps ?? 0;
  const bpsFee = Number.isFinite(parsedPrice) ? (parsedPrice * bps) / 10_000 : 0;
  const platformFee = Number.isFinite(parsedPrice) && parsedPrice > 0 ? Math.min(parsedPrice, Math.max(minFee, bpsFee)) : 0;
  const ownerNet = Number.isFinite(parsedPrice) && parsedPrice > 0 ? Math.max(0, parsedPrice - platformFee) : 0;

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <p>Campaign fee policy and campaign creation fee are controlled by contract admin.</p>
      <label>
        Owner wallet
        <input
          name="ownerWallet"
          type="text"
          value={ownerWallet}
          onChange={(event) => setOwnerWallet(event.target.value)}
          placeholder="Enter owner wallet to load clubs"
          readOnly={ownerWalletLocked}
        />
      </label>
      {ownerWalletLocked ? <p className="kicker">Owner wallet comes from your connected session.</p> : null}
      <label>
        Club
        <select aria-label="Club" value={clubId} onChange={(event) => setClubId(event.target.value)}>
          {!ownerClubs.length ? <option value="">No clubs found for this owner</option> : null}
          {ownerClubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.slug} ({club.id})
            </option>
          ))}
        </select>
      </label>
      <label>
        Campaign name
        <input name="name" type="text" placeholder="VIP 2026 Access" />
      </label>
      <label>
        Price
        <input
          name="priceAtomic"
          type="number"
          min="0"
          step="0.000001"
          placeholder="5"
          value={priceAtomic}
          onChange={(event) => setPriceAtomic(event.target.value)}
        />
      </label>
      <p className="kicker">Payment token: SOL only</p>
      <div className="panel">
        <p><strong>Owner fee preview (only visible to owner)</strong></p>
        {selectedClub ? (
          <div className="stack-sm">
            <p>Configured platform policy: {selectedClub.campaignFeeBps} bps + {selectedClub.minCampaignFeeAtomic} SOL min</p>
            <p>Member pays: {Number.isFinite(parsedPrice) ? parsedPrice.toFixed(6) : "0.000000"} SOL</p>
            <p>Platform fee: {platformFee.toFixed(6)} SOL</p>
            <p>Owner receives: {ownerNet.toFixed(6)} SOL</p>
          </div>
        ) : (
          <p>Select an owned club to view fee and net preview.</p>
        )}
      </div>
      <label>
        Mint mode
        <select
          aria-label="Mint mode"
          name="mintMode"
          value={mintMode}
          onChange={(event) => setMintMode(event.target.value as "on_purchase" | "live_event")}
        >
          <option value="on_purchase">Mint on purchase</option>
          <option value="live_event">Live mint event</option>
        </select>
      </label>
      {mintMode === "live_event" ? (
        <label>
          Live mint start date/time
          <input name="liveStartDateTime" type="datetime-local" />
        </label>
      ) : null}
      <label>
        NFT template image URI
        <input
          name="templateImageUri"
          type="text"
          value={templateImageUri}
          onChange={(event) => setTemplateImageUri(event.target.value)}
          placeholder="/api/media/tpl-... or https://..."
        />
      </label>
      <label>
        Upload template image
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setTemplateFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <button type="button" className="btn-primary" onClick={() => void uploadTemplate()}>
        Upload template
      </button>
      <label>
        Max supply
        <input name="maxSupply" type="number" min="1" placeholder="300" />
      </label>
      <label>
        Expiry mode
        <select aria-label="Expiry mode" name="expiryMode" defaultValue="fixed">
          <option value="indefinite">Indefinite</option>
          <option value="fixed">Fixed end date</option>
        </select>
      </label>
      <label>
        End date
        <input name="endDate" type="date" />
      </label>
      <button type="submit" className="btn-primary">Create campaign</button>
      <p>{status}</p>
    </form>
  );
}

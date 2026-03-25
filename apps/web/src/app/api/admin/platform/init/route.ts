import { NextRequest, NextResponse } from "next/server";

import { initializePlatform } from "@/lib/data/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    ownerApprovalFee?: number;
    clubCreationFee?: number;
    campaignCreationFee?: number;
    defaultCampaignFeeBps?: number;
    defaultMinCampaignFeeAtomic?: string;
  };

  const ownerApprovalFee = Number(body.ownerApprovalFee ?? 0.5);
  const clubCreationFee = Number(body.clubCreationFee ?? 1);
  const campaignCreationFee = Number(body.campaignCreationFee ?? 0.5);
  const defaultCampaignFeeBps = Number(body.defaultCampaignFeeBps ?? 200);
  const defaultMinCampaignFeeAtomic = String(body.defaultMinCampaignFeeAtomic ?? "0.0003").trim();

  if (!Number.isFinite(ownerApprovalFee) || ownerApprovalFee < 0) {
    return NextResponse.json({ error: "invalid_owner_approval_fee" }, { status: 400 });
  }
  if (!Number.isFinite(clubCreationFee) || clubCreationFee <= 0) {
    return NextResponse.json({ error: "invalid_club_creation_fee" }, { status: 400 });
  }
  if (!Number.isFinite(campaignCreationFee) || campaignCreationFee < 0) {
    return NextResponse.json({ error: "invalid_campaign_creation_fee" }, { status: 400 });
  }
  if (!Number.isFinite(defaultCampaignFeeBps) || defaultCampaignFeeBps < 0 || defaultCampaignFeeBps > 10_000) {
    return NextResponse.json({ error: "invalid_campaign_fee_bps" }, { status: 400 });
  }
  const minFee = Number(defaultMinCampaignFeeAtomic);
  if (!Number.isFinite(minFee) || minFee < 0) {
    return NextResponse.json({ error: "invalid_min_campaign_fee" }, { status: 400 });
  }

  const config = initializePlatform({
    ownerApprovalFee,
    clubCreationFee,
    campaignCreationFee,
    defaultCampaignFeeBps,
    defaultMinCampaignFeeAtomic,
  });

  return NextResponse.json({ ok: true, config });
}

import { NextRequest, NextResponse } from "next/server";

import { initializePlatform } from "@/lib/data/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    clubCreationFee?: number;
    campaignCreationFee?: number;
    campaignFeeBps?: number;
  };

  const clubCreationFee = Number(body.clubCreationFee ?? 1);
  const campaignCreationFee = Number(body.campaignCreationFee ?? 0.5);
  const campaignFeeBps = Number(body.campaignFeeBps ?? 500);

  if (!Number.isFinite(clubCreationFee) || clubCreationFee <= 0) {
    return NextResponse.json({ error: "invalid_club_creation_fee" }, { status: 400 });
  }
  if (!Number.isFinite(campaignCreationFee) || campaignCreationFee < 0) {
    return NextResponse.json({ error: "invalid_campaign_creation_fee" }, { status: 400 });
  }
  if (!Number.isFinite(campaignFeeBps) || campaignFeeBps < 0 || campaignFeeBps > 10_000) {
    return NextResponse.json({ error: "invalid_campaign_fee_bps" }, { status: 400 });
  }

  const config = initializePlatform({
    clubCreationFee,
    campaignCreationFee,
    campaignFeeBps,
  });

  return NextResponse.json({ ok: true, config });
}

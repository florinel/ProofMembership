import { NextRequest, NextResponse } from "next/server";

import { setClubFeePolicy } from "@/lib/data/store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await context.params;
  const body = (await request.json()) as {
    campaignFeeBps?: number;
    minCampaignFeeAtomic?: string;
  };

  const campaignFeeBps = Number(body.campaignFeeBps ?? NaN);
  const minCampaignFeeAtomic = String(body.minCampaignFeeAtomic ?? "").trim();

  if (!Number.isFinite(campaignFeeBps) || campaignFeeBps < 0 || campaignFeeBps > 10_000) {
    return NextResponse.json({ error: "invalid_campaign_fee_bps" }, { status: 400 });
  }

  const minFee = Number(minCampaignFeeAtomic);
  if (!Number.isFinite(minFee) || minFee < 0) {
    return NextResponse.json({ error: "invalid_min_campaign_fee" }, { status: 400 });
  }

  try {
    const club = setClubFeePolicy({
      clubId,
      campaignFeeBps,
      minCampaignFeeAtomic,
    });
    return NextResponse.json({ ok: true, club });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_club_fee_policy_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
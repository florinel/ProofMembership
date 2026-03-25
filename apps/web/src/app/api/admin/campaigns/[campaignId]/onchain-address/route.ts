import { NextRequest, NextResponse } from "next/server";

import { setCampaignOnchainAddress } from "@/lib/data/store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  const params = await context.params;
  const campaignId = String(params.campaignId ?? "").trim();

  const body = (await request.json()) as {
    onchainAddress?: string;
  };

  const onchainAddress = String(body.onchainAddress ?? "").trim();

  if (!campaignId || !onchainAddress) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  try {
    const campaign = setCampaignOnchainAddress({
      campaignId,
      onchainAddress,
    });
    return NextResponse.json({ ok: true, campaign }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "set_campaign_onchain_address_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

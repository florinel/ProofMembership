import { NextRequest, NextResponse } from "next/server";

import { purchaseMembership } from "@/lib/data/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    campaignId?: string;
    buyerWallet?: string;
  };

  const campaignId = String(body.campaignId ?? "").trim();
  const buyerWallet = String(body.buyerWallet ?? "").trim();

  if (!campaignId || !buyerWallet) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  try {
    const result = purchaseMembership({
      campaignId,
      buyerWallet,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "purchase_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { purchaseMembershipOnchain } from "@/lib/chain/purchase";
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
    const mode = (process.env.SOLNFT_PURCHASE_MODE ?? "local").toLowerCase();
    if (mode === "onchain") {
      const result = await purchaseMembershipOnchain({
        campaignId,
        buyerWallet,
      });
      return NextResponse.json({ ok: true, mode: "onchain", ...result }, { status: 202 });
    }

    const result = purchaseMembership({
      campaignId,
      buyerWallet,
    });

    return NextResponse.json({ ok: true, mode: "local", ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "purchase_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

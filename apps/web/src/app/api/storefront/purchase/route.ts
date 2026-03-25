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
    const mode = (process.env.PROOFMEMBERSHIP_PURCHASE_MODE ?? "local").toLowerCase();
    if (mode === "onchain") {
      // Onchain mode returns an intent for wallet signing; projection happens
      // only after `/api/storefront/purchase/confirm` verifies the tx.
      const result = await purchaseMembershipOnchain({
        campaignId,
        buyerWallet,
      });
      return NextResponse.json({ ok: true, mode: "onchain", ...result }, { status: 202 });
    }

    // Local mode applies synthetic purchase + projection immediately.
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

import { NextRequest, NextResponse } from "next/server";

import { verifyOnchainPurchaseTx } from "@/lib/chain/purchase";
import { projectOnchainMembershipPurchase } from "@/lib/data/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    campaignId?: string;
    buyerWallet?: string;
    txSignature?: string;
  };

  const campaignId = String(body.campaignId ?? "").trim();
  const buyerWallet = String(body.buyerWallet ?? "").trim();
  const txSignature = String(body.txSignature ?? "").trim();

  if (!campaignId || !buyerWallet || !txSignature) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  try {
    // Projection only happens after strict RPC-backed verification succeeds.
    await verifyOnchainPurchaseTx({
      campaignId,
      buyerWallet,
      txSignature,
    });

    // Persist as a read-model event so UI can reflect successful onchain
    // purchases immediately, before a full indexer ingestion pipeline exists.
    const projection = projectOnchainMembershipPurchase({
      campaignId,
      buyerWallet,
      txSignature,
    });

    return NextResponse.json({ ok: true, ...projection }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "project_onchain_purchase_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
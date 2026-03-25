import { NextRequest, NextResponse } from "next/server";

import { createWalletChallenge } from "@/lib/auth/walletChallenge";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { wallet?: string };
  const wallet = String(body.wallet ?? "").trim();

  if (!wallet) {
    return NextResponse.json({ error: "wallet_required" }, { status: 400 });
  }

  try {
    const challenge = createWalletChallenge(wallet);
    return NextResponse.json({
      nonce: challenge.nonce,
      message: challenge.message,
      expiresAtUnix: challenge.expiresAtUnix,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "challenge_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

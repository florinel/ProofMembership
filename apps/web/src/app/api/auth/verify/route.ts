import { NextRequest, NextResponse } from "next/server";

import { resolveRoleForWallet } from "@/lib/auth/roleResolver";
import { getSessionCookieName, getSessionTtlSeconds, issueSessionToken } from "@/lib/auth/token";
import { verifyWalletSignature } from "@/lib/auth/walletChallenge";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    wallet?: string;
    nonce?: string;
    message?: string;
    signature?: string;
  };

  const wallet = String(body.wallet ?? "").trim();
  const nonce = String(body.nonce ?? "").trim();
  const message = String(body.message ?? "");
  const signature = String(body.signature ?? "").trim();

  if (!wallet || !nonce || !message || !signature) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  try {
    verifyWalletSignature({ wallet, nonce, message, signature });
    const role = resolveRoleForWallet(wallet);
    const sessionToken = await issueSessionToken({ wallet, role });

    const response = NextResponse.json({ ok: true, wallet, role });
    response.cookies.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionTtlSeconds(),
    });

    return response;
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "verification_failed";
    return NextResponse.json({ error: messageText }, { status: 400 });
  }
}

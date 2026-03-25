export async function setDevRole(role: "public" | "member" | "owner" | "admin"): Promise<void> {
  const response = await fetch("/api/auth/dev-role", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    throw new Error("Failed to set role");
  }
}

export type WalletChallengeResponse = {
  nonce: string;
  message: string;
  expiresAtUnix: number;
};

function isWalletChallengeResponse(
  value: WalletChallengeResponse | { error?: string }
): value is WalletChallengeResponse {
  return (
    typeof (value as WalletChallengeResponse).nonce === "string"
    && typeof (value as WalletChallengeResponse).message === "string"
    && typeof (value as WalletChallengeResponse).expiresAtUnix === "number"
  );
}

export async function createWalletChallenge(wallet: string): Promise<WalletChallengeResponse> {
  // Server returns challenge payload that must be signed by the same wallet.
  const response = await fetch("/api/auth/challenge", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ wallet }),
  });

  const data = (await response.json()) as WalletChallengeResponse | { error?: string };
  if (!response.ok || !isWalletChallengeResponse(data)) {
    throw new Error("Failed to create wallet challenge");
  }

  return data;
}

export async function verifyWalletSession(payload: {
  wallet: string;
  nonce: string;
  message: string;
  signature: string;
}): Promise<{ wallet: string; role: "public" | "member" | "owner" | "admin" }> {
  // Verification endpoint both validates signature and sets session cookie.
  const response = await fetch("/api/auth/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to verify wallet signature");
  }

  const data = (await response.json()) as {
    wallet?: string;
    role?: "public" | "member" | "owner" | "admin";
  };

  if (!data.wallet || !data.role) {
    throw new Error("Invalid verify response");
  }

  return {
    wallet: data.wallet,
    role: data.role,
  };
}

export async function clearWalletSession(): Promise<void> {
  // Logout is best-effort for UI callers; endpoint clears cookie server-side.
  await fetch("/api/auth/logout", {
    method: "POST",
  });
}

import type { AppRole } from "@/lib/auth/roles";
import { isApprovedOwner, listMembershipsByWallet } from "@/lib/data/store";

function getAdminWalletSet(): Set<string> {
  const fromEnv = (process.env.PROOFMEMBERSHIP_ADMIN_WALLETS ?? "")
    .split(",")
    .map((wallet) => wallet.trim().toLowerCase())
    .filter(Boolean);
  return new Set(fromEnv);
}

export function resolveRoleForWallet(wallet: string): AppRole {
  const normalized = wallet.trim().toLowerCase();
  if (!normalized) {
    return "public";
  }

  if (getAdminWalletSet().has(normalized)) {
    return "admin";
  }

  if (isApprovedOwner(wallet)) {
    return "owner";
  }

  const hasMembership = listMembershipsByWallet(wallet).some((membership) => !membership.revoked);
  if (hasMembership) {
    return "member";
  }

  return "public";
}

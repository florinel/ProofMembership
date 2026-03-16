import type { AppRole } from "@/lib/auth/roles";
import { listClubs, listMembershipsByWallet } from "@/lib/data/store";

function getAdminWalletSet(): Set<string> {
  const fromEnv = (process.env.SOLNFT_ADMIN_WALLETS ?? "")
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

  const ownsClub = listClubs().some((club) => club.ownerWallet.toLowerCase() === normalized);
  if (ownsClub) {
    return "owner";
  }

  const hasMembership = listMembershipsByWallet(wallet).some((membership) => !membership.revoked);
  if (hasMembership) {
    return "member";
  }

  return "public";
}

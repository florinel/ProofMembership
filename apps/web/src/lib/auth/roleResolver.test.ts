import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/store", () => ({
  isApprovedOwner: vi.fn(),
  listMembershipsByWallet: vi.fn(),
}));

import { isApprovedOwner, listMembershipsByWallet } from "@/lib/data/store";
import { resolveRoleForWallet } from "@/lib/auth/roleResolver";

const isApprovedOwnerMock = vi.mocked(isApprovedOwner);
const listMembershipsByWalletMock = vi.mocked(listMembershipsByWallet);

describe("resolveRoleForWallet", () => {
  const originalAdmins = process.env.PROOFMEMBERSHIP_ADMIN_WALLETS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PROOFMEMBERSHIP_ADMIN_WALLETS = "";
    isApprovedOwnerMock.mockReturnValue(false);
    listMembershipsByWalletMock.mockReturnValue([]);
  });

  it("returns admin when wallet is listed in admin env", () => {
    process.env.PROOFMEMBERSHIP_ADMIN_WALLETS = "admin-wallet,other-wallet";

    expect(resolveRoleForWallet(" ADMIN-WALLET ")).toBe("admin");
  });

  it("returns owner for approved owner wallet", () => {
    isApprovedOwnerMock.mockReturnValue(true);

    expect(resolveRoleForWallet("owner-wallet")).toBe("owner");
  });

  it("returns member when wallet has active membership and is not owner", () => {
    listMembershipsByWalletMock.mockReturnValue([
      {
        id: "m-1",
        campaignId: "camp-1",
        ownerWallet: "member-wallet",
        nftMint: "mint-1",
        purchasedAtUnix: 1,
        expiresAtUnix: null,
        revoked: false,
      },
    ]);

    expect(resolveRoleForWallet("member-wallet")).toBe("member");
  });

  it("ignores revoked memberships when resolving member role", () => {
    listMembershipsByWalletMock.mockReturnValue([
      {
        id: "m-1",
        campaignId: "camp-1",
        ownerWallet: "member-wallet",
        nftMint: "mint-1",
        purchasedAtUnix: 1,
        expiresAtUnix: null,
        revoked: true,
      },
    ]);

    expect(resolveRoleForWallet("member-wallet")).toBe("public");
  });

  it("returns public for blank wallet", () => {
    expect(resolveRoleForWallet("   ")).toBe("public");
  });

  afterAll(() => {
    process.env.PROOFMEMBERSHIP_ADMIN_WALLETS = originalAdmins;
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/data/store", () => ({
  submitOwnerApplication: vi.fn(),
  getLatestOwnerApplicationByWallet: vi.fn(),
  isApprovedOwner: vi.fn(),
}));

import {
  getLatestOwnerApplicationByWallet,
  isApprovedOwner,
  submitOwnerApplication,
} from "@/lib/data/store";
import { GET as getOwnerApplications, POST as postOwnerApplications } from "@/app/api/owner-applications/route";

const submitOwnerApplicationMock = vi.mocked(submitOwnerApplication);
const getLatestOwnerApplicationByWalletMock = vi.mocked(getLatestOwnerApplicationByWallet);
const isApprovedOwnerMock = vi.mocked(isApprovedOwner);

describe("owner applications API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns wallet status and latest application for GET requests", async () => {
    getLatestOwnerApplicationByWalletMock.mockReturnValue({
      id: "oapp-1",
      wallet: "owner-wallet-1",
      description: "Community",
      status: "pending",
      settlementStatus: "pending_settlement",
      settlementAmountAtomic: "0.500000",
      submitEscrowTxSignature: null,
      approvalSettlementTxSignature: null,
      refundSettlementTxSignature: null,
      createdAtUnix: 1_700_000_000,
      reviewedAtUnix: null,
      reviewNote: null,
    });
    isApprovedOwnerMock.mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/owner-applications?wallet=owner-wallet-1", {
      method: "GET",
    });

    const response = await getOwnerApplications(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      wallet: "owner-wallet-1",
      approvedOwner: false,
      application: {
        id: "oapp-1",
        status: "pending",
        settlementStatus: "pending_settlement",
      },
    });
  });

  it("rejects GET requests without wallet query", async () => {
    const request = new NextRequest("http://localhost/api/owner-applications", {
      method: "GET",
    });

    const response = await getOwnerApplications(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "wallet_required" });
  });

  it("submits owner application on POST", async () => {
    submitOwnerApplicationMock.mockReturnValue({
      id: "oapp-2",
      wallet: "owner-wallet-2",
      description: "Club details",
      status: "pending",
      settlementStatus: "pending_settlement",
      settlementAmountAtomic: "0.500000",
      submitEscrowTxSignature: null,
      approvalSettlementTxSignature: null,
      refundSettlementTxSignature: null,
      createdAtUnix: 1_700_000_123,
      reviewedAtUnix: null,
      reviewNote: null,
    });

    const request = new NextRequest("http://localhost/api/owner-applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: " owner-wallet-2 ", description: " Club details " }),
    });

    const response = await postOwnerApplications(request);
    expect(response.status).toBe(201);
    expect(submitOwnerApplicationMock).toHaveBeenCalledWith({
      wallet: "owner-wallet-2",
      description: "Club details",
    });
  });
});

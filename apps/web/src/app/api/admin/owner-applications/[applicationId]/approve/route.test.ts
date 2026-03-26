import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/data/store", () => ({
  approveOwnerApplication: vi.fn(),
}));

import { approveOwnerApplication } from "@/lib/data/store";
import { POST as postApproveOwnerApplication } from "@/app/api/admin/owner-applications/[applicationId]/approve/route";

const approveOwnerApplicationMock = vi.mocked(approveOwnerApplication);

describe("admin owner-application approve route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves application without requiring fee payload", async () => {
    approveOwnerApplicationMock.mockReturnValue({
      id: "oapp-1",
      wallet: "owner-wallet-1",
      description: "desc",
      status: "approved",
      settlementStatus: "settled_to_admin",
      settlementAmountAtomic: "0.500000",
      submitEscrowTxSignature: null,
      approvalSettlementTxSignature: null,
      refundSettlementTxSignature: null,
      createdAtUnix: 1_700_000_000,
      reviewedAtUnix: 1_700_000_050,
      reviewNote: null,
    });

    const request = new NextRequest("http://localhost/api/admin/owner-applications/oapp-1/approve", {
      method: "POST",
    });

    const response = await postApproveOwnerApplication(request, {
      params: Promise.resolve({ applicationId: "oapp-1" }),
    });

    expect(response.status).toBe(200);
    expect(approveOwnerApplicationMock).toHaveBeenCalledWith({ applicationId: "oapp-1" });
    await expect(response.json()).resolves.toMatchObject({ ok: true, application: { id: "oapp-1" } });
  });
});

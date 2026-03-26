
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminFlowClient from "./AdminFlowClient";

// Mock fetch and auth dependencies
vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  json: async () => ({}),
})));
vi.mock("@/lib/auth/roles", () => ({
  canAccess: vi.fn(() => Promise.resolve(true)),
}));

function createJsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

describe("AdminFlowClient UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders platform config including hybrid fee fields", async () => {
    const overview = {
      approvedOwners: 2,
      pendingOwnerApplications: 1,
      owners: 2,
      clubs: 2,
      campaigns: 3,
      activeCampaigns: 2,
      incomingDepositsAtomic: "0.5",
      platformBalanceAtomic: "1.5",
      config: {
        initialized: true,
        ownerApprovalFee: 0.5,
        clubCreationFee: 1,
        campaignCreationFee: 0.5,
        defaultCampaignFeeBps: 200,
        defaultMinCampaignFeeAtomic: "0.0003",
        perMemberFee: 0.02,
        perMemberFeeCap: 1.5,
        perMemberFeeDiscountThreshold: 10,
        perMemberFeeDiscount: 0.01,
      },
    };
    const applications = { pending: [] };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse(overview))
      .mockResolvedValueOnce(createJsonResponse(applications))
    );
    render(<AdminFlowClient />);
    fireEvent.click(screen.getByRole("button", { name: /refresh overview/i }));
    await waitFor(() => {
      expect(screen.getByText(/per-member fee: 0.02 sol/i)).toBeInTheDocument();
      expect(screen.getByText(/discount: 0.01 after 10 members/i)).toBeInTheDocument();
      expect(screen.getByText(/cap: 1.5 sol/i)).toBeInTheDocument();
    });
  });
});

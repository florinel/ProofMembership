import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OwnerOnboardingClient from "@/components/owner/OwnerOnboardingClient";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function createJsonResponse(data: unknown, ok = true, status = 200): MockResponse {
  return {
    ok,
    status,
    json: async () => data,
  };
}

describe("OwnerOnboardingClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows overriding a prefilled session wallet when submitting an owner application", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({ application: { id: "oapp-1" } })
    );

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<OwnerOnboardingClient initialWallet="dev-wallet" canCreateClub={false} />);

    const walletInput = screen.getByLabelText("Wallet");
    expect(walletInput).not.toHaveAttribute("readonly");
    expect(screen.getByText("Prefilled from your current session. You can replace it to simulate another owner wallet.")).toBeInTheDocument();

    fireEvent.change(walletInput, {
      target: { value: "owner-wallet-123" },
    });
    fireEvent.change(screen.getByLabelText("Club description"), {
      target: { value: "Simulation owner application" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Submit Application" }).closest("form")!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Owner application submitted: oapp-1")).toBeInTheDocument();
    });

    const request = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request[0]).toBe("/api/owner-applications");
    expect(request[1].method).toBe("POST");

    const body = JSON.parse(String(request[1].body)) as {
      wallet: string;
      description: string;
    };

    expect(body.wallet).toBe("owner-wallet-123");
    expect(body.description).toBe("Simulation owner application");
  });

  it("hides the owner application section when rendered in dashboard mode", () => {
    render(<OwnerOnboardingClient initialWallet="owner-wallet" showApplication={false} />);

    expect(screen.queryByText("Apply for Club Ownership")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create Club" })).toBeInTheDocument();
  });

  it("shows persistent status details from status-check endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        wallet: "owner-wallet-777",
        approvedOwner: false,
        application: {
          id: "oapp-777",
          status: "rejected",
          settlementStatus: "returned_to_applicant",
          settlementAmountAtomic: "0.500000",
          submitEscrowTxSignature: null,
          approvalSettlementTxSignature: null,
          refundSettlementTxSignature: null,
          createdAtUnix: 1_700_000_000,
          reviewedAtUnix: 1_700_000_100,
          reviewNote: "Please provide clearer club details",
        },
      })
    );

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<OwnerOnboardingClient initialWallet="owner-wallet-777" canCreateClub={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Check Status" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/owner-applications?wallet=owner-wallet-777");
      expect(screen.getByText("Application was rejected. Review notes are shown below.")).toBeInTheDocument();
      expect(screen.getByText("Application ID: oapp-777")).toBeInTheDocument();
      expect(screen.getByText("Application status: rejected")).toBeInTheDocument();
      expect(screen.getByText("Settlement status: returned_to_applicant")).toBeInTheDocument();
      expect(screen.getByText("Settlement amount (policy): 0.500000 SOL")).toBeInTheDocument();
      expect(screen.getByText("Review note: Please provide clearer club details")).toBeInTheDocument();
    });
  });
});

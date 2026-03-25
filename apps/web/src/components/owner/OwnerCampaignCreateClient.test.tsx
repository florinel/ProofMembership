import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import OwnerCampaignCreateClient from "@/components/owner/OwnerCampaignCreateClient";

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

describe("OwnerCampaignCreateClient visual flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows owner clubs in dropdown when owner wallet matches", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse([
        { id: "club-1", slug: "alpha", ownerWallet: "owner-wallet-A" },
        { id: "club-2", slug: "beta", ownerWallet: "owner-wallet-B" },
      ])
    );

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<OwnerCampaignCreateClient />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/clubs");
    });

    fireEvent.change(screen.getByPlaceholderText("Enter owner wallet to load clubs"), {
      target: { value: "owner-wallet-A" },
    });

    await waitFor(() => {
      expect(screen.getByText("alpha (club-1)")).toBeInTheDocument();
      expect(screen.queryByText("beta (club-2)")).not.toBeInTheDocument();
    });
  });

  it("toggles live mint start input based on mint mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse([]));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<OwnerCampaignCreateClient />);

    expect(screen.queryByLabelText("Live mint start date/time")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Mint mode"), {
      target: { value: "live_event" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Live mint start date/time")).toBeInTheDocument();
    });
  });
});

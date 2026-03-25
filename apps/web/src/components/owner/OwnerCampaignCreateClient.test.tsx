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

  it("uses initial owner wallet and preselected club", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse([
        { id: "club-1", slug: "alpha", ownerWallet: "owner-wallet-a", campaignFeeBps: 500, minCampaignFeeAtomic: "0.100000" },
        { id: "club-2", slug: "beta", ownerWallet: "owner-wallet-a", campaignFeeBps: 900, minCampaignFeeAtomic: "0.200000" },
      ])
    );

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<OwnerCampaignCreateClient initialOwnerWallet="owner-wallet-a" preselectedClubId="club-2" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("owner-wallet-a")).toHaveAttribute("readonly");
      expect(screen.getByLabelText("Club")).toHaveValue("club-2");
    });
  });

  it("uploads template image and surfaces the resulting URI", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/clubs") {
        return Promise.resolve(createJsonResponse([{ id: "club-1", slug: "alpha", ownerWallet: "owner-wallet-a", campaignFeeBps: 500, minCampaignFeeAtomic: "0.100000" }]));
      }

      if (String(input) === "/api/owner/template-upload" && init?.method === "POST") {
        return Promise.resolve(createJsonResponse({
          mediaUri: "/api/media/tpl-123",
          permanentUri: "https://arweave.net/tpl-123",
          storage: "arweave",
        }));
      }

      return Promise.reject(new Error(`Unexpected fetch call: ${String(input)}`));
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<OwnerCampaignCreateClient initialOwnerWallet="owner-wallet-a" preselectedClubId="club-1" />);

    const file = new File([new Uint8Array([137, 80, 78, 71])], "template.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload template image"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload template" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("/api/media/tpl-123")).toBeInTheDocument();
      expect(screen.getByText("Template uploaded (arweave): https://arweave.net/tpl-123")).toBeInTheDocument();
    });
  });

  it("blocks campaign submission until a template image is present", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse([{ id: "club-1", slug: "alpha", ownerWallet: "owner-wallet-a", campaignFeeBps: 500, minCampaignFeeAtomic: "0.100000" }])
    );

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<OwnerCampaignCreateClient initialOwnerWallet="owner-wallet-a" preselectedClubId="club-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText("Club")).toHaveValue("club-1");
    });

    fireEvent.change(screen.getByLabelText("Campaign name"), {
      target: { value: "Spring Access" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create campaign" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Upload or provide a template image URI before creating campaign.")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("submits live-event campaign payload with derived timestamps", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/clubs") {
        return Promise.resolve(createJsonResponse([{ id: "club-2", slug: "beta", ownerWallet: "owner-wallet-b", campaignFeeBps: 800, minCampaignFeeAtomic: "0.250000" }]));
      }

      if (String(input) === "/api/owner/campaigns" && init?.method === "POST") {
        return Promise.resolve(createJsonResponse({
          campaign: { id: "camp-1", name: "VIP Night" },
        }));
      }

      return Promise.reject(new Error(`Unexpected fetch call: ${String(input)}`));
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<OwnerCampaignCreateClient initialOwnerWallet="owner-wallet-b" preselectedClubId="club-2" />);

    await waitFor(() => {
      expect(screen.getByLabelText("Club")).toHaveValue("club-2");
    });

    fireEvent.change(screen.getByLabelText("Campaign name"), {
      target: { value: "VIP Night" },
    });
    fireEvent.change(screen.getByLabelText("Price"), {
      target: { value: "7.5" },
    });
    fireEvent.change(screen.getByLabelText("Mint mode"), {
      target: { value: "live_event" },
    });
    fireEvent.change(screen.getByLabelText("Live mint start date/time"), {
      target: { value: "2026-04-01T19:30" },
    });
    fireEvent.change(screen.getByLabelText("NFT template image URI"), {
      target: { value: "https://example.com/vip-night.png" },
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-04-30" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create campaign" }).closest("form")!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Campaign created: VIP Night. Go to /storefront to purchase.")).toBeInTheDocument();
    });

    const request = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(request[0]).toBe("/api/owner/campaigns");
    expect(request[1].method).toBe("POST");

    const body = JSON.parse(String(request[1].body)) as {
      clubId: string;
      ownerWallet: string;
      name: string;
      priceAtomic: string;
      templateImageUri: string;
      mintMode: string;
      mintStartsAtUnix: number;
      expiresAtUnix: number;
    };

    expect(body.clubId).toBe("club-2");
    expect(body.ownerWallet).toBe("owner-wallet-b");
    expect(body.name).toBe("VIP Night");
    expect(body.priceAtomic).toBe("7.5");
    expect(body.templateImageUri).toBe("https://example.com/vip-night.png");
    expect(body.mintMode).toBe("live_event");
    expect(body.mintStartsAtUnix).toBe(Math.floor(new Date("2026-04-01T19:30").getTime() / 1000));
    expect(body.expiresAtUnix).toBe(Math.floor(new Date("2026-04-30T00:00:00Z").getTime() / 1000));
  });
});

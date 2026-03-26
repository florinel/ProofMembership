

vi.mock("@/lib/auth/roles", () => ({
  canAccess: vi.fn(() => Promise.resolve(true)),
}));
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AdminClubDetailPage from "./page";
// Mock the data layer
vi.mock("@/lib/data/store", () => ({
  findClub: vi.fn(() => ({
    id: "club-1",
    slug: "alpha",
    ownerWallet: "owner-wallet-xyz",
    metadataUri: "https://example.com/club-1.json",
    campaignFeeBps: 200,
    minCampaignFeeAtomic: "0.1",
  })),
  listCampaignsByClub: vi.fn(() => ([
    {
      id: "camp-1",
      name: "Spring Bash",
      priceAtomic: "5",
      status: "active",
      expiresAtUnix: 2000000000,
    },
  ])),
}));


// Helper to render async server components
type AsyncComponent<P = object> = (props: P) => Promise<React.ReactElement>;
async function renderAsyncComponent<P>(Component: AsyncComponent<P>, props: P) {
  const result = await Component(props);
  render(result);
}

describe("AdminClubDetailPage", () => {
  it("renders club detail and campaign table", async () => {
    await renderAsyncComponent(AdminClubDetailPage, { params: Promise.resolve({ clubId: "club-1" }) });
    expect(await screen.findByText(/club detail/i)).toBeInTheDocument();
    expect(await screen.findByText(/owner wallet:/i)).toBeInTheDocument();
    expect(await screen.findByText(/platform per-member fee:/i)).toBeInTheDocument();
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(await screen.findByText(/Spring Bash/i)).toBeInTheDocument();
  });
});



vi.mock("@/lib/auth/roles", () => ({
  canAccess: vi.fn(() => Promise.resolve(true)),
}));
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AdminPage from "./page";
// Mock data dependencies
vi.mock("@/lib/data/store", () => ({
  getAdminOverview: vi.fn(() => ({
    owners: 1,
    clubs: 1,
    campaigns: 1,
    platformBalanceAtomic: "1.0",
  })),
  listClubs: vi.fn(() => ([{
    id: "club-1",
    slug: "alpha",
    ownerWallet: "owner-wallet-xyz",
    campaignFeeBps: 200,
    minCampaignFeeAtomic: "0.1",
  }])),
  listCampaignsByClub: vi.fn(() => ([{
    id: "camp-1",
    name: "Spring Bash",
    priceAtomic: "5",
    status: "active",
    expiresAtUnix: 2000000000,
  }])),
}));


// Helper to render async server components
type AsyncComponent<P = object> = (props: P) => Promise<React.ReactElement>;
async function renderAsyncComponent<P>(Component: AsyncComponent<P>, props: P) {
  const result = await Component(props);
  render(result);
}

describe("AdminPage", () => {
  it("renders admin dashboard stats and club table", async () => {
    await renderAsyncComponent(AdminPage, {} as object);
    expect(await screen.findByText(/contract admin/i)).toBeInTheDocument();
    const clubsLabels = await screen.findAllByText(/clubs/i);
    expect(clubsLabels.length).toBeGreaterThan(1);
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});

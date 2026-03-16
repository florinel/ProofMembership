import { canAccess } from "@/lib/auth/roles";
import { listCampaignsByClub, listClubs } from "@/lib/data/store";
import Link from "next/link";

function formatExpiry(expiresAtUnix: number | null): string {
  if (!expiresAtUnix) {
    return "Indefinite";
  }
  return new Date(expiresAtUnix * 1000).toISOString().slice(0, 10);
}

export default async function OwnerPage() {
  const allowed = await canAccess("owner");
  const clubs = listClubs();
  const club = clubs[0];
  const ownerCampaigns = club ? listCampaignsByClub(club.id) : [];

  if (!allowed) {
    return (
      <main className="container">
        <h1>Club Owner</h1>
        <div className="panel">
          <p>This route requires owner role.</p>
          <p>Use /dev to set the cookie role to owner while developing role-gated UX.</p>
        </div>
      </main>
    );
  }

  if (!club) {
    return (
      <main className="container">
        <h1>Club Owner</h1>
        <div className="panel">
          <p>No clubs available yet. Ask admin to create a club first.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Club Owner</h1>
      <p className="kicker">Active club: {club.slug}</p>
      <p>
        <Link href="/owner/campaigns/new">Create new campaign</Link>
      </p>
      <div className="panel">
        <h3>Campaign control center</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Mint</th>
              <th>Status</th>
              <th>Supply</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {ownerCampaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td>{campaign.name}</td>
                <td>
                  {campaign.priceAtomic} {campaign.paymentToken}
                </td>
                <td>{campaign.mintMode === "live_event" ? "Live event" : "On purchase"}</td>
                <td>{campaign.status}</td>
                <td>
                  {campaign.maxSupply ? `${campaign.mintedSupply}/${campaign.maxSupply}` : `${campaign.mintedSupply}/unlimited`}
                </td>
                <td>{formatExpiry(campaign.expiresAtUnix)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

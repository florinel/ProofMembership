import Link from "next/link";
import { notFound } from "next/navigation";

import { canAccess } from "@/lib/auth/roles";
import { findClub, listCampaignsByClub } from "@/lib/data/store";

function formatExpiry(expiresAtUnix: number | null): string {
  if (!expiresAtUnix) {
    return "Indefinite";
  }
  return new Date(expiresAtUnix * 1000).toISOString().slice(0, 10);
}

export default async function AdminClubDetailPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const allowed = await canAccess("admin");
  if (!allowed) {
    return (
      <main className="container">
        <h1>Contract Admin</h1>
        <div className="panel">
          <p>This route requires admin role.</p>
        </div>
      </main>
    );
  }

  const { clubId } = await params;
  const club = findClub(clubId);

  if (!club) {
    notFound();
  }

  const clubCampaigns = listCampaignsByClub(club.id);

  return (
    <main className="container">
      <h1>Club Detail</h1>
      <p className="kicker">{club.slug}</p>
      <div className="panel">
        <p>Owner wallet: {club.ownerWallet}</p>
        <p>Metadata URI: {club.metadataUri}</p>
        <p>Campaign fee BPS: {club.campaignFeeBps}</p>
        <p>Minimum campaign fee: {club.minCampaignFeeAtomic} SOL</p>
      </div>
      <div className="panel">
        <h3>Campaigns</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Status</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {clubCampaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td>{campaign.name}</td>
                <td>
                  {campaign.priceAtomic} SOL
                </td>
                <td>{campaign.status}</td>
                <td>{formatExpiry(campaign.expiresAtUnix)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/admin">Back to admin</Link>
    </main>
  );
}

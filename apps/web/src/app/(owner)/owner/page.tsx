import { canAccess, getSessionClaims } from "@/lib/auth/roles";
import { listCampaignsByClub, listClubs } from "@/lib/data/store";
import OwnerOnboardingClient from "@/components/owner/OwnerOnboardingClient";
import Link from "next/link";

function formatExpiry(expiresAtUnix: number | null): string {
  if (!expiresAtUnix) {
    return "Indefinite";
  }
  return new Date(expiresAtUnix * 1000).toISOString().slice(0, 10);
}

export default async function OwnerPage() {
  const allowed = await canAccess("owner");
  const sessionClaims = await getSessionClaims();
  const connectedWallet = sessionClaims?.wallet ?? null;

  const clubs = listClubs();
  const ownerClubs = connectedWallet
    ? clubs.filter((club) => club.ownerWallet.toLowerCase() === connectedWallet.toLowerCase())
    : clubs;

  if (!allowed) {
    return (
      <main className="container">
        <h1>Club Owner</h1>
        <div className="panel">
          <p>This route requires approved owner access.</p>
          <p>
            Submit an owner application at <Link href="/owner/apply">/owner/apply</Link> and sign in again after approval.
          </p>
        </div>
      </main>
    );
  }

  if (!ownerClubs.length) {
    return (
      <main className="container">
        <h1>Club Owner</h1>
        <div className="panel">
          {connectedWallet ? (
            <p>No clubs for connected wallet {connectedWallet}. Create your first club below.</p>
          ) : (
            <p>No clubs yet. Create your first club below.</p>
          )}
        </div>
        <OwnerOnboardingClient
          initialWallet={connectedWallet ?? undefined}
          canCreateClub
          showApplication={false}
        />
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Club Owner</h1>
      {connectedWallet ? <p className="kicker">Connected wallet: {connectedWallet}</p> : null}
      <p className="kicker">Manage your clubs below. Expand each club to manage campaigns under it.</p>
      <p className="kicker">You can create additional clubs after approval by paying the club creation fee.</p>
      <OwnerOnboardingClient
        initialWallet={connectedWallet ?? undefined}
        canCreateClub
        showApplication={false}
      />
      <div className="panel">
        <h3>Club Manager</h3>
        <div className="accordion-list">
          {ownerClubs.map((club, index) => {
            const campaigns = listCampaignsByClub(club.id);

            return (
              <details key={club.id} className="accordion-item" open={index === 0}>
                <summary>
                  <span>{club.slug}</span>
                  <span className="kicker">{campaigns.length} campaign(s)</span>
                </summary>
                <div className="stack-sm">
                  <p>Owner wallet: {club.ownerWallet}</p>
                  <p>Fee policy: {club.campaignFeeBps} bps + {club.minCampaignFeeAtomic} SOL min</p>
                  <p>
                    <Link href={`/owner/campaigns/new?clubId=${encodeURIComponent(club.id)}`}>
                      Create campaign for this club
                    </Link>
                  </p>
                  {!campaigns.length ? (
                    <p className="kicker">No campaigns yet for this club.</p>
                  ) : (
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
                        {campaigns.map((campaign) => (
                          <tr key={campaign.id}>
                            <td>{campaign.name}</td>
                            <td>{campaign.priceAtomic} SOL</td>
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
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </main>
  );
}

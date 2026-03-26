import React from "react";
import { canAccess } from "@/lib/auth/roles";
import { getAdminOverview, listCampaignsByClub, listClubs } from "@/lib/data/store";
import AdminFlowClient from "@/components/admin/AdminFlowClient";
import Link from "next/link";

export default async function AdminPage() {
  const allowed = await canAccess("admin");
  const adminOverview = getAdminOverview();
  const clubs = listClubs();

  if (!allowed) {
    return (
      <main className="container">
        <h1>Contract Admin</h1>
        <div className="panel">
          <p>This route requires admin role.</p>
          <p>Use /dev to set the cookie role to admin while developing role-gated UX.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container container-wide">
      <h1>Contract Admin</h1>
      <div className="stats-grid">
        <section className="panel">
          <h2>{adminOverview.owners}</h2>
          <p>Club owners</p>
        </section>
        <section className="panel">
          <h2>{adminOverview.clubs}</h2>
          <p>Clubs</p>
        </section>
        <section className="panel">
          <h2>{adminOverview.campaigns}</h2>
          <p>Campaigns</p>
        </section>
        <section className="panel">
          <h2>{adminOverview.platformBalanceAtomic}</h2>
          <p>Platform balance</p>
        </section>
      </div>
      <div className="panel">
        <h3>Clubs</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Slug</th>
              <th>Owner</th>
              <th>Fee Policy</th>
              <th>Campaigns</th>
            </tr>
          </thead>
          <tbody>
            {clubs.map((club) => {
              const campaignCount = listCampaignsByClub(club.id).length;
              return (
                <tr key={club.id}>
                  <td>
                    <Link href={`/admin/clubs/${club.id}`}>{club.slug}</Link>
                  </td>
                  <td>{club.ownerWallet}</td>
                  <td>{club.campaignFeeBps} bps + {club.minCampaignFeeAtomic} SOL min</td>
                  <td>{campaignCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AdminFlowClient />
    </main>
  );
}

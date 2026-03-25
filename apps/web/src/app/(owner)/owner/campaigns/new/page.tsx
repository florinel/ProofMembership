import Link from "next/link";

import { canAccess, getSessionClaims } from "@/lib/auth/roles";
import OwnerCampaignCreateClient from "@/components/owner/OwnerCampaignCreateClient";

type OwnerCreateCampaignPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OwnerCreateCampaignPage({ searchParams }: OwnerCreateCampaignPageProps) {
  const allowed = await canAccess("owner");
  const sessionClaims = await getSessionClaims();
  const params = searchParams ? await searchParams : {};
  const clubIdValue = params.clubId;
  const preselectedClubId = typeof clubIdValue === "string" ? clubIdValue : undefined;

  if (!allowed) {
    return (
      <main className="container">
        <h1>Create Campaign</h1>
        <div className="panel">
          <p>This route requires owner role.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Create Campaign</h1>
      <p className="kicker">Set membership price in SOL with clear platform-fee and owner-net preview.</p>
      <OwnerCampaignCreateClient
        initialOwnerWallet={sessionClaims?.wallet}
        preselectedClubId={preselectedClubId}
      />
      <Link href="/owner">Back to owner dashboard</Link>
    </main>
  );
}

import Link from "next/link";

import { canAccess } from "@/lib/auth/roles";
import OwnerCampaignCreateClient from "@/components/owner/OwnerCampaignCreateClient";

export default async function OwnerCreateCampaignPage() {
  const allowed = await canAccess("owner");

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
      <OwnerCampaignCreateClient />
      <Link href="/owner">Back to owner dashboard</Link>
    </main>
  );
}

import { getSessionClaims } from "@/lib/auth/roles";
import OwnerOnboardingClient from "@/components/owner/OwnerOnboardingClient";
import Link from "next/link";

export default async function OwnerApplyPage() {
  const sessionClaims = await getSessionClaims();

  return (
    <main className="container">
      <h1>Owner Onboarding</h1>
      <div className="panel">
        <p>Any wallet can apply for owner approval from this page.</p>
        <p>
          After approval, sign in again with the same wallet to access the owner dashboard at <Link href="/owner">/owner</Link>.
        </p>
      </div>
      <OwnerOnboardingClient initialWallet={sessionClaims?.wallet} canCreateClub={false} showApplication />
    </main>
  );
}
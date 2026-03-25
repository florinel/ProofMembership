import StorefrontFlowClient from "@/components/storefront/StorefrontFlowClient";
import { getSessionClaims } from "@/lib/auth/roles";

export default async function StorefrontPage() {
  const sessionClaims = await getSessionClaims();

  return (
    <main className="container">
      <h1>Storefront</h1>
      <p className="kicker">Complete buyer flow: discover campaign, purchase, and verify membership.</p>
      <StorefrontFlowClient initialWallet={sessionClaims?.wallet} />
    </main>
  );
}

import StorefrontFlowClient from "@/components/storefront/StorefrontFlowClient";

export default function StorefrontPage() {
  return (
    <main className="container">
      <h1>Storefront</h1>
      <p className="kicker">Complete buyer flow: discover campaign, purchase, and verify membership.</p>
      <StorefrontFlowClient />
    </main>
  );
}

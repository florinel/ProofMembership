import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>ProofMembership Platform</h1>
      <p>Role-based UI shell is ready.</p>
      <div className="grid">
        <Link href="/admin">Contract Admin</Link>
        <Link href="/owner">Club Owner</Link>
        <Link href="/storefront">Member Storefront</Link>
        <Link href="/dev">Dev Role Switcher</Link>
      </div>
    </main>
  );
}

import WalletConnectClient from "@/components/auth/WalletConnectClient";

export default function WalletAuthPage() {
  return (
    <main className="container">
      <h1>Wallet Connect Sign-In</h1>
      <p className="kicker">Use a real wallet signature to create your role session cookie for protected routes.</p>
      <WalletConnectClient />
    </main>
  );
}

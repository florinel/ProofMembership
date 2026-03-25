import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { SolanaProvider } from "@/lib/types/solana";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./styles.css";

// Global Solana provider type augmentation
declare global {
  interface Window {
    solana?: SolanaProvider;
  }
}

export const metadata: Metadata = {
  title: "SolNFT",
  description: "Solana club membership platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}

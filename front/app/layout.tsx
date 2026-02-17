import type { Metadata } from "next";
import { Space_Grotesk, Pirata_One } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/header";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const pirataOne = Pirata_One({
  variable: "--font-pirata-one",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Horus - Onchain Prediction Markets",
  description: "Fully onchain prediction markets on Base with USDC collateral",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${pirataOne.variable} font-sans antialiased bg-[#0a0a0a] text-white`}
      >
        <Providers>
          <Header />
          <main className="min-h-screen bg-[#0a0a0a]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

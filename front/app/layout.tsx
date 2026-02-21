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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://horus.vercel.app';

const miniAppEmbed = JSON.stringify({
  version: '1',
  imageUrl: `${APP_URL}/api/og`,
  button: {
    title: 'Predict Now',
    action: {
      type: 'launch_frame',
      name: 'Horus',
      url: APP_URL,
      splashImageUrl: `${APP_URL}/icon.png`,
      splashBackgroundColor: '#0a0a0a',
    },
  },
});

export const metadata: Metadata = {
  title: "Horus - Onchain Prediction Markets",
  description: "Fully onchain prediction markets on Base with USDC collateral",
  other: {
    'fc:miniapp': miniAppEmbed,
    'fc:frame': miniAppEmbed,
  },
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

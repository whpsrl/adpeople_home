import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AdPeople AI - Meta Ads Strategist",
  description: "Il tuo Media Buyer & Copywriter AI autonomo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased min-h-screen selection:bg-indigo-500/30`}>
        {children}
      </body>
    </html>
  );
}

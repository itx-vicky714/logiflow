import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import "@fontsource/material-symbols-outlined/index.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "LogiFlow - Precision Control Tower",
  description: "AI-powered B2B logistics and supply chain management platform with orbital intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Network Waterfall Suppression */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://xrmupqlgjjyyexnfktbe.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://xrmupqlgjjyyexnfktbe.supabase.co" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

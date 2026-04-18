import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: '--font-inter',
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
    <html lang="en" className={inter.variable}>
      <head>
        {/* Network Waterfall Suppression */}
        <link rel="preconnect" href="https://xrmupqlgjjyyexnfktbe.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://xrmupqlgjjyyexnfktbe.supabase.co" />

        {/* Local Font Subsetting: Preload critical Material Symbols subset */}
        <link 
          rel="preload" 
          as="font" 
          type="font/woff2"
          href="/fonts/material-symbols.woff2" 
          crossOrigin="anonymous"
        />

        {/* Critical CSS Inlining for LCP/CLS Optimization */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root { --surface: #f8f9fa; --on-surface: #1a1c1e; --primary: #493ee5; }
          body { background: var(--surface); color: var(--on-surface); margin: 0; min-height: 100vh; -webkit-font-smoothing: antialiased; }
          h1, h2, h3 { color: var(--on-surface); letter-spacing: -0.02em; }
          .curated-shadow { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
          .animate-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        `}} />
      </head>
      <body className="font-sans">
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}

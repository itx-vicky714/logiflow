import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";

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

        {/* Font Subsetting (1.1MB -> ~15KB) & Preload */}
        <link 
          rel="preload" 
          as="style" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..0&display=swap&text=_abcdefghijklmnopqrstuvwxyz0123456789" 
        />
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..0&display=swap&text=_abcdefghijklmnopqrstuvwxyz0123456789"
        />

        {/* Critical CSS Inlining for LCP Optimization */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root { --surface: #f8f9fa; --on-surface: #1a1c1e; }
          body { background: var(--surface); color: var(--on-surface); margin: 0; font-family: 'Inter', sans-serif; }
          .curated-shadow { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          .animate-in { animation: fade-in 0.6s ease-out; }
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        `}} />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}

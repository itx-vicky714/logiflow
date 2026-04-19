import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LogiFlow — AI Logistics Control Tower for India",
  description: "Track every shipment in real time. AI delay prediction, weather-aware route risk, and instant alerts across road, rail, air, and sea — built for Indian logistics teams.",
  keywords: "logistics tracking India, shipment management software, supply chain visibility, freight tracking, route optimization India",
  authors: [{ name: "Vicky Kumar" }],
  openGraph: {
    title: "LogiFlow — AI Logistics Control Tower",
    description: "Real-time shipment visibility for Indian logistics teams",
    url: "https://logiflow-lake.vercel.app",
    siteName: "LogiFlow",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LogiFlow Platform Overview",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LogiFlow — AI Logistics Control Tower",
    description: "Real-time shipment visibility for Indian logistics teams",
    images: ["/og-image.png"],
  },
  other: {
    "copyright": "© 2026 Vicky Kumar. LogiFlow. All rights reserved.",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "LogiFlow",
              "description": "AI-powered logistics control tower for shipment tracking across India",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web Browser",
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" },
              "author": { "@type": "Person", "name": "Vicky Kumar", "description": "PGDM Student, Bihar, India" },
              "creator": { "@type": "Person", "name": "Vicky Kumar" }
            })
          }}
        />
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


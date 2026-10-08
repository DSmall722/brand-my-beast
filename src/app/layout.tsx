import type { Metadata, Viewport } from "next";
import { Syne, IBM_Plex_Sans } from "next/font/google";
import { BRAND, PUBLIC_SITE_ORIGIN } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: PUBLIC_COPY.meta.title,
  description: PUBLIC_COPY.meta.description,
  metadataBase: new URL(PUBLIC_SITE_ORIGIN),
  alternates: {
    canonical: PUBLIC_SITE_ORIGIN,
  },
  applicationName: BRAND.name,
  openGraph: {
    title: BRAND.name,
    description: PUBLIC_COPY.meta.description,
    url: PUBLIC_SITE_ORIGIN,
    siteName: BRAND.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description: PUBLIC_COPY.meta.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        {process.env.VERCEL ? <SiteAnalytics /> : null}
      </body>
    </html>
  );
}

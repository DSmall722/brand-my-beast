import type { Metadata } from "next";
import { Syne, IBM_Plex_Sans } from "next/font/google";
import { PUBLIC_COPY } from "@/lib/public-copy";
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

export const metadata: Metadata = {
  title: PUBLIC_COPY.meta.title,
  description: PUBLIC_COPY.meta.description,
  metadataBase: new URL("https://brandmybeast.com"),
  openGraph: {
    title: "BrandMyBeast",
    description: PUBLIC_COPY.meta.description,
    url: "https://brandmybeast.com",
    siteName: "BrandMyBeast",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}

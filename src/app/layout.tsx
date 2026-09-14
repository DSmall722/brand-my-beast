import type { Metadata } from "next";
import { Syne, IBM_Plex_Sans } from "next/font/google";
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
  title: "BrandMyBeast — twelve panels on a Cyberbeast",
  description:
    "Standing bids fund a Tesla Cybertruck Cyberbeast. Miss $58,000 and nobody is charged. Immortal etch unlocks only at $120,000.",
  metadataBase: new URL("https://brandmybeast.com"),
  openGraph: {
    title: "BrandMyBeast",
    description:
      "Twelve brands on a Cyberbeast. Ordered only if the board clears.",
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

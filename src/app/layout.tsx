import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: {
    default: "Fruitful Rooms — Affordable Furnished Rooms for Rent in Florida",
    template: "%s — Fruitful Rooms",
  },
  description: "Affordable furnished rooms for rent in Orlando, Daytona Beach, Ormond Beach, and Mulberry FL. All utilities included. No deposit, no brokers. Apply online today.",
  keywords: ["rooms for rent", "furnished rooms", "co-living", "rooms for rent Orlando FL", "rooms for rent Daytona Beach", "affordable rooms Florida", "room rental no deposit"],
  openGraph: {
    type: "website",
    siteName: "Fruitful Rooms",
    title: "Fruitful Rooms — Affordable Furnished Rooms for Rent in Florida",
    description: "Furnished rooms starting at $650/month. Utilities included, no deposit. Orlando, Daytona Beach, Ormond Beach & Mulberry FL.",
    url: "https://fruitfulrooms.com",
  },
  twitter: {
    card: "summary",
    title: "Fruitful Rooms — Affordable Furnished Rooms for Rent",
    description: "Furnished rooms starting at $650/month. Utilities included, no deposit. Central Florida locations.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://fruitfulrooms.com" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

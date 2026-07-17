import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Dormscape — Your dorm room, planned before move-in day",
  description:
    "Free AI dorm room planner. Pick your school, choose a vibe, set a budget — get a room layout that fits your exact dorm, with a shoppable list from Amazon and Target.",
  openGraph: {
    title: "Dormscape — Your dorm room, planned before move-in day",
    description:
      "Pick your school, choose a vibe, set a budget. Get a room layout that fits your exact dorm, with a shoppable list.",
    siteName: "Dormscape",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${instrument.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

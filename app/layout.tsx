import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
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

const DESCRIPTION =
  "Free AI dorm room planner. Pick your school, choose a vibe, set a budget, and get a room layout that fits your exact dorm, with a shoppable Amazon list.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://dormscape.com"),
  title: {
    default: "Dormscape",
    template: "%s | Dormscape",
  },
  description: DESCRIPTION,
  openGraph: {
    title: "Dormscape: your dorm room, planned before move-in day",
    description:
      "Pick your school, choose a vibe, set a budget. Get a room layout that fits your exact dorm, with a shoppable list.",
    siteName: "Dormscape",
    type: "website",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Dormscape, the free AI dorm room planner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dormscape: your dorm room, planned before move-in day",
    description: DESCRIPTION,
    images: ["/og.png"],
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
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

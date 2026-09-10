import type { Metadata } from "next";
import localFont from "next/font/local";
import MotionProvider from "@/components/experience/MotionProvider";
import { AuthProvider } from "@/lib/auth-context";
import { UpgradeProvider } from "@/lib/upgrade-context";
import CookieConsent from "@/components/site/CookieConsent";
import "./globals.css";
import "./experience.css";

const bricolage = localFont({
  src: "../public/experience/fonts/bricolage.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
  preload: false,
});
const instrument = localFont({
  src: "../public/experience/fonts/instrument-sans.woff2",
  variable: "--font-instrument",
  weight: "400 700",
  display: "swap",
});
const plexMono = localFont({
  src: "../public/experience/fonts/plex-mono.woff2",
  variable: "--font-plex-mono",
  weight: "400",
  display: "swap",
  preload: false,
});
const syne = localFont({
  src: "../public/experience/fonts/syne.woff2",
  variable: "--font-syne",
  weight: "400 800",
  display: "swap",
});
const serif = localFont({
  src: "../public/experience/fonts/instrument-serif-italic.woff2",
  variable: "--font-serif",
  style: "italic",
  weight: "400",
  display: "swap",
});

const DESCRIPTION =
  "Free dorm planner built on real, building-specific dimensions. Pick a vibe, set a budget, and get a layout that fits your room, plus a shoppable Amazon list.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://dormscape.us",
  ),
  title: {
    // Lowercase to match the wordmark; this is the
    // browser tab title, so every page inherits the lowercase brand token.
    default: "dormscape",
    template: "%s | dormscape",
  },
  description: DESCRIPTION,
  openGraph: {
    title: "dormscape: your dorm room, planned before move-in day",
    description:
      "Pick your school, choose a vibe, set a budget. Get a room layout that fits your exact dorm, with a shoppable list.",
    siteName: "dormscape",
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
    title: "dormscape: your dorm room, planned before move-in day",
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
      className={`${bricolage.variable} ${instrument.variable} ${plexMono.variable} ${syne.variable} ${serif.variable}`}
    >
      <body className="min-h-screen antialiased">
        <MotionProvider>
          <CookieConsent />
          <AuthProvider>
            <UpgradeProvider>{children}</UpgradeProvider>
          </AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}

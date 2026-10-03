import type { Metadata } from "next";
import localFont from "next/font/local";
import MotionProvider from "@/components/experience/MotionProvider";
import { AuthProvider } from "@/lib/auth-context";
import { UpgradeProvider } from "@/lib/upgrade-context";
import CookieConsent from "@/components/site/CookieConsent";
import RevealObserver from "@/components/ds/RevealObserver";
import "./globals.css";
import "./experience.css";
import "./ds.css";
import "./ds-dialog.css";

// Redesign type system: Archivo (UI and display, wght + wdth axes), Fraunces
// italic (the second line of every headline), Martian Mono (labels and tags).
// Self-hosted variable fonts, SIL OFL (licenses beside the files), trimmed to
// the axis ranges the design uses (fontTools instancer): Archivo wght 400–900
// and wdth 84–100%; Fraunces pinned at opsz 144 / SOFT 30 / WONK 1, wght
// 300–700; Martian Mono at wdth 100, wght 400–800.
const archivo = localFont({
  src: "./fonts/archivo.woff2",
  variable: "--font-archivo",
  weight: "400 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "84% 100%" }],
});
const fraunces = localFont({
  src: "./fonts/fraunces-italic.woff2",
  variable: "--font-fraunces",
  weight: "300 700",
  style: "italic",
  display: "swap",
});
const martian = localFont({
  src: "./fonts/martian-mono.woff2",
  variable: "--font-martian",
  weight: "400 800",
  display: "swap",
});

const DESCRIPTION =
  "Plan and furnish your college room with a layout and shoppable Amazon list. Save your ideas in My rooms and coordinate move-in with roommates.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://dormscape.us",
  ),
  // Pages set their own title ("Elder Hall Room Dimensions, Northwestern");
  // the lowercase brand rides along so tabs and results still read dormscape.
  title: { default: "dormscape", template: "%s | dormscape" },
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
        url: "/og.png?v=folded-room",
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
    images: ["/og.png?v=folded-room"],
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
      className={`${archivo.variable} ${fraunces.variable} ${martian.variable}`}
    >
      <body className="min-h-screen antialiased">
        <MotionProvider>
          <CookieConsent />
          <RevealObserver />
          <AuthProvider>
            <UpgradeProvider>{children}</UpgradeProvider>
          </AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}

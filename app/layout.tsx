import type { Metadata } from "next";
import { IBM_Plex_Mono, Outfit, Instrument_Serif } from "next/font/google";
import "./globals.css";

// Start Adam/Eve feedback loop scheduler (server-side only, once per deployment)
if (typeof globalThis !== "undefined" && !(globalThis as Record<string, unknown>).__edenSchedulerInit) {
  (globalThis as Record<string, unknown>).__edenSchedulerInit = true;
  const baseUrl = process.env.NEXTAUTH_URL || "https://edencloud.app";
  import("@/lib/adam-eve-loop").then((m) => {
    m.startAdamScheduler(baseUrl);
    m.startEveScheduler(baseUrl);
  }).catch(() => {});
}

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eden — The AI Service Economy",
  description:
    "Eden connects builders who publish AI services with consumers who discover and run them. Powered by Leaf's — transparent pricing, no hidden charges, contribution economy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/ui/toaster";
import { APP_NAME } from "@/lib/branding";

import { Providers } from "./providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "Commissioning field observation tool for Parkhill engineers: record a field observation, work through recommended diagnostic checks and corrective actions, and produce a field report.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deliberately not capped at 1. Engineers pinch-zoom field photos and small
  // print on a phone, and blocking that is an accessibility regression.
  maximumScale: 5,
  // Ask the browser to resize the layout viewport when the on-screen keyboard
  // opens, which is what keeps `100dvh` layouts honest on mobile.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `light` asserts light mode explicitly. See the note in `providers.tsx`.
    <html lang="en" className={`light ${inter.variable}`}>
      <body>
        <Providers>
          {/* The header is in the (app) layout, so the sign-in page renders
              without it. */}
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

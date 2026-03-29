import type { Metadata } from "next";
import "./globals.css";
import { GameApp } from "@psg1/core";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://psg-1-game-pad-simulator-web.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "PSG1 Gamepad Simulator",
  description:
    "1,800 lines. 3 dependencies. Zero secrets. Drop a gamepad into any " +
    "Solana app, open source, fully auditable, nothing to trust.",
  openGraph: {
    title: "PSG1 Gamepad Simulator — by Sol-HQ",
    description:
      "Drop-in gamepad navigation for PSG1 / Solana web games. " +
      "Open source, zero dependencies, fully auditable.",
    url: SITE_URL,
    siteName: "PSG1 Gamepad Simulator",
    images: [
      {
        url: "/og-image.jpg",
        width: 1024,
        height: 1024,
        alt: "PSG1 Gamepad Simulator — open source browser gamepad for Solana",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PSG1 Gamepad Simulator — by Sol-HQ",
    description:
      "1,800 lines. 3 deps. Zero secrets. Drop a gamepad into any Solana app.",
    images: ["/og-image.jpg"],
    creator: "@KITEMAN",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head />
      <body>
        {/* GameApp mounts the gamepad polling loop and loads the PSG1 widget when ?gp is in the URL */}
        <GameApp>{children}</GameApp>
      </body>
    </html>
  );
}

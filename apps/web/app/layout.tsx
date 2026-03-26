import type { Metadata } from "next";
import "./globals.css";
import GameApp from "@/components/GameApp";

export const metadata: Metadata = {
  title: "PSG1 Gamepad Simulator",
  description:
    "PlaySolana Gamepad 1 — open-source browser gamepad emulator for Solana game devs. " +
    "Drop-in navigation, virtual keyboard, and moju pointer for any React/Next.js app.",
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

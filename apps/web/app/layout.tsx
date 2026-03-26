import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}

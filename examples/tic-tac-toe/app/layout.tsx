import type { Metadata } from "next";
import { GameApp } from "@psg1/core";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tic-Tac-Toe — PSG1 Example Game",
  description: "Tic-Tac-Toe with full PSG1 GamePad Simulator integration. Add ?gp to the URL to activate the controller overlay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head />
      <body>
        <GameApp>{children}</GameApp>
      </body>
    </html>
  );
}

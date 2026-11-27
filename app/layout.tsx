import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const display = Outfit({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "BML Refresher 2026",
  description: "Live team activities, quizzes and word clouds for the BML Refresher programme",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#070b1f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}

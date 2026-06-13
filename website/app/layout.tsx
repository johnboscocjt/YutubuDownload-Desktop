import type { Metadata } from "next";
import "./globals.css";
import HomePage from "@/components/HomePage";
import { APP } from "@/lib/config";

export const metadata: Metadata = {
  title: `${APP.name} — ${APP.tagline}`,
  description:
    "Download YouTube videos, playlists, and MP3 with probe-verified quality. Desktop app for Windows, Linux, macOS plus terminal installer.",
  icons: { icon: "/icon.png" },
  openGraph: {
    title: APP.name,
    description: APP.tagline,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

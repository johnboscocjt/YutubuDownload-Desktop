import type { Metadata } from "next";
import "./globals.css";
import { APP } from "@/lib/config";

export const metadata: Metadata = {
  title: `${APP.name} — ${APP.tagline}`,
  description:
    "Download YouTube videos, playlists, and MP3 with probe-verified quality. Linux .deb desktop app plus terminal installer.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "128x128", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: APP.name,
    description: APP.tagline,
    type: "website",
    images: ["/screenshots/01-download-playlist-mp3.png"],
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

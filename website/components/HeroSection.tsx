"use client";

import { useEffect, useState } from "react";
import { APP } from "@/lib/config";
import type { Platform } from "@/lib/config";
import HeroBackground from "./svg/HeroBackground";
import StatsCounter from "./StatsCounter";
import ImageLightbox from "./ImageLightbox";
import { IconArrowRight } from "./svg/Icons";

const HERO_SHOT = {
  src: "/screenshots/01-download-playlist-mp3.png",
  alt: "YutubuDownload desktop app",
  title: "Download — full playlist as MP3",
};

export default function HeroSection() {
  const [lightbox, setLightbox] = useState(false);
  const [primaryPlatform, setPrimaryPlatform] = useState<Platform>("linux");

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() ?? "";
    if (ua.includes("win") || platform.includes("win")) setPrimaryPlatform("windows");
    else if (ua.includes("mac") || platform.includes("mac")) setPrimaryPlatform("macos");
    else if (ua.includes("linux") || platform.includes("linux")) setPrimaryPlatform("linux");
  }, []);

  return (
    <section className="hero">
      <HeroBackground />
      <div className="container hero-inner">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="pulse-dot" />
            <span className="hero-badge-text">v{APP.version} · Desktop + Terminal</span>
            <span className="hero-badge-shimmer" />
          </div>

          <h1 className="hero-title">
            <span className="hero-line">Download YouTube</span>
            <span className="hero-line hero-gradient">with probe-verified quality</span>
          </h1>

          <p className="hero-desc">
            {APP.tagline}. Built for real networks in Tanzania and beyond —
            stable quality, playlist support, MP3 extraction, and a sleek desktop app.
          </p>

          <div className="hero-actions">
            <a className="btn btn-primary btn-glow" href={`/api/download?platform=${primaryPlatform}`}>
              Download free
              <IconArrowRight />
            </a>
            <a
              className="btn btn-ghost"
              href={`https://github.com/${APP.repo}`}
              target="_blank"
              rel="noreferrer"
            >
              View source
            </a>
          </div>

          <StatsCounter />
        </div>

        <div className="hero-visual">
          <div className="hero-card-stack">
            <div className="hero-mock hero-mock-back" />
            <div className="hero-mock hero-mock-mid" />
            <button
              type="button"
              className="hero-mock hero-mock-front hero-mock-btn"
              onClick={() => setLightbox(true)}
              aria-label="View app screenshot full size"
            >
              <img
                src={HERO_SHOT.src}
                alt={HERO_SHOT.alt}
                width={560}
                height={360}
              />
              <div className="hero-mock-glow" />
              <span className="hero-mock-expand">Click to enlarge</span>
            </button>
            <div className="hero-stat-chip chip-1">
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <path d="M12 3v12M8 11l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              MP3 · Playlist
            </div>
            <div className="hero-stat-chip chip-2">
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Quality verified
            </div>
          </div>
        </div>
      </div>

      <ImageLightbox
        image={lightbox ? HERO_SHOT : null}
        onClose={() => setLightbox(false)}
      />
    </section>
  );
}

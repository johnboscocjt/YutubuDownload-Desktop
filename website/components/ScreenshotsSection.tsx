"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import ImageLightbox, { type LightboxImage } from "./ImageLightbox";

export const SHOTS = [
  {
    src: "/screenshots/01-download-playlist-mp3.png",
    title: "Download",
    category: "Download",
    tag: "MP3 · Playlist",
    body: "Full playlist as MP3 with per-video progress, real playlist title, and destination folder.",
  },
  {
    src: "/screenshots/02-play-completed.png",
    title: "Play Completed",
    category: "Playback",
    tag: "Library",
    body: "Search, filter, play all, pick a track, autoplay, and loop playlists.",
  },
  {
    src: "/screenshots/03-history.png",
    title: "History",
    category: "History",
    tag: "Open playlist",
    body: "Track every job. Open in VLC/mpv or jump to destination.",
  },
  {
    src: "/screenshots/04-docs.png",
    title: "Docs",
    category: "Documentation",
    tag: "In-app",
    body: "Built-in guides for setup, downloading, architecture, and troubleshooting.",
  },
  {
    src: "/screenshots/05-setup.png",
    title: "Setup",
    category: "Setup",
    tag: "Dependencies",
    body: "One-screen check for yt-dlp, ffmpeg, JS runtime, and browser cookies.",
  },
  {
    src: "/screenshots/06-settings.png",
    title: "Settings",
    category: "Settings",
    tag: "Network",
    body: "Background playback and concurrent fragments tuned for your network.",
  },
] as const;

type Shot = (typeof SHOTS)[number];

const AUTO_MS = 5500;

function slideStyle(offset: number, transitioning: boolean): React.CSSProperties {
  const abs = Math.abs(offset);
  if (abs > 2) {
    return {
      opacity: 0,
      pointerEvents: "none",
      transform: "translateX(-50%) translateZ(-300px) rotateY(0deg) scale(0.6)",
      zIndex: 0,
    };
  }

  const base: React.CSSProperties = {
    transition: transitioning
      ? "transform 0.75s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.55s ease, filter 0.55s ease"
      : "none",
    zIndex: 10 - abs,
  };

  if (offset === 0) {
    return {
      ...base,
      opacity: 1,
      transform: "translateX(-50%) translateZ(120px) rotateY(0deg) scale(1)",
      filter: "brightness(1)",
    };
  }

  const dir = offset > 0 ? 1 : -1;
  const x = -50 + dir * (42 + abs * 18);
  const rot = -dir * (22 + abs * 6);
  const z = -80 - abs * 50;
  const scale = 0.92 - abs * 0.06;

  return {
    ...base,
    opacity: abs === 1 ? 0.55 : 0.25,
    transform: `translateX(${x}%) translateZ(${z}px) rotateY(${rot}deg) scale(${scale})`,
    filter: `brightness(${0.65 - abs * 0.1})`,
    pointerEvents: abs === 1 ? "auto" : "none",
  };
}

function CarouselTopo() {
  return (
    <svg className="carousel-topo" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <pattern id="topo" width="120" height="120" patternUnits="userSpaceOnUse">
          <path
            d="M0 60 Q30 20 60 60 T120 60 M0 90 Q30 50 60 90 T120 90 M0 30 Q30 70 60 30 T120 30"
            fill="none"
            stroke="rgba(0,230,184,0.06)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#topo)" />
      <ellipse cx="600" cy="300" rx="400" ry="200" fill="none" stroke="rgba(0,230,184,0.04)" strokeWidth="1" />
      <ellipse cx="600" cy="300" rx="280" ry="140" fill="none" stroke="rgba(59,158,255,0.05)" strokeWidth="1" />
      <ellipse cx="600" cy="300" rx="160" ry="80" fill="none" stroke="rgba(0,230,184,0.06)" strokeWidth="1" />
    </svg>
  );
}

export default function ScreenshotsSection() {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);
  const [paused, setPaused] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const transitioning = useRef(true);

  const count = SHOTS.length;

  const go = useCallback(
    (index: number) => {
      transitioning.current = true;
      setActive(((index % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => go(active + 1), [active, go]);
  const prev = useCallback(() => go(active - 1), [active, go]);

  useEffect(() => {
    if (paused || lightbox || showGrid) return;
    const id = window.setInterval(() => {
      transitioning.current = true;
      setActive((i) => (i + 1) % count);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, lightbox, showGrid, count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightbox || showGrid) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, showGrid, next, prev]);

  function openShot(s: Shot) {
    setLightbox({ src: s.src, alt: `${s.title} screen`, title: s.title });
  }

  return (
    <section id="screenshots" className="section-screenshots">
      <div className="section-glow section-glow-right" aria-hidden />
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="section-tag">Interface</span>
            <h2>See the app</h2>
            <p>
              YutubuDownload Desktop v2.0.1 — explore every screen in 3D.
              <span className="section-hint"> Click the active slide for full size.</span>
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div
            className="carousel-stage"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <CarouselTopo />

            <div className="carousel-3d">
              <div className="carousel-track">
                {SHOTS.map((s, i) => {
                  let offset = i - active;
                  if (offset > count / 2) offset -= count;
                  if (offset < -count / 2) offset += count;

                  return (
                    <article
                      key={s.title}
                      className={`carousel-slide ${offset === 0 ? "carousel-slide-active" : ""}`}
                      style={slideStyle(offset, transitioning.current)}
                      onClick={() => {
                        if (offset === 0) openShot(s);
                        else if (Math.abs(offset) === 1) go(i);
                      }}
                      aria-hidden={Math.abs(offset) > 1}
                    >
                      <div className="carousel-card">
                        <div className="carousel-card-img">
                          <img src={s.src} alt={s.title} loading={i <= 2 ? "eager" : "lazy"} />
                          <div className="carousel-card-vignette" />
                        </div>
                        {offset === 0 && (
                          <div className="carousel-card-meta">
                            <div className="carousel-card-badges">
                              <span className="carousel-hot">Featured</span>
                              <span className="carousel-cat">{s.category}</span>
                            </div>
                            <h3 className="carousel-card-title">{s.title}</h3>
                            <p className="carousel-card-desc">{s.body}</p>
                            <button
                              type="button"
                              className="carousel-launch"
                              onClick={(e) => {
                                e.stopPropagation();
                                openShot(s);
                              }}
                            >
                              View full screen
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="carousel-side-controls">
              <button
                type="button"
                className="carousel-ctrl carousel-ctrl-play"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Resume slideshow" : "Pause slideshow"}
                title={paused ? "Play" : "Pause"}
              >
                {paused ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                  </svg>
                )}
              </button>
              <button type="button" className="carousel-ctrl" onClick={next} aria-label="Next slide">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className="carousel-ctrl carousel-ctrl-prev" onClick={prev} aria-label="Previous slide">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="carousel-footer">
              <button
                type="button"
                className="carousel-see-all"
                onClick={() => setShowGrid((g) => !g)}
              >
                {showGrid ? "Hide grid" : "See all screens"}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="carousel-thumbs" role="tablist" aria-label="Screenshot slides">
                {SHOTS.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    aria-label={`Go to ${s.title}`}
                    className={`carousel-thumb ${i === active ? "carousel-thumb-active" : ""}`}
                    onClick={() => go(i)}
                  >
                    <img src={s.src} alt="" />
                  </button>
                ))}
              </div>
            </div>

            <div className="carousel-progress" aria-hidden>
              <span
                className="carousel-progress-bar"
                style={{ animationPlayState: paused || lightbox || showGrid ? "paused" : "running" }}
                key={active}
              />
            </div>
          </div>
        </Reveal>

        <div className={`carousel-grid ${showGrid ? "carousel-grid-open" : ""}`}>
          {SHOTS.map((s) => (
            <button
              key={s.title}
              type="button"
              className="carousel-grid-item"
              onClick={() => openShot(s)}
            >
              <img src={s.src} alt={s.title} loading="lazy" />
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </section>
  );
}

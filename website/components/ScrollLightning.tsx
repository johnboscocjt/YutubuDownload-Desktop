"use client";

import { useEffect, useId, useMemo, useState } from "react";

const SEGMENT = 88;
const WIDTH = 100;

/** Sharp zigzag path — lightning-style down the page */
function buildLightningPath(totalHeight: number): string {
  const segments = Math.max(8, Math.ceil(totalHeight / SEGMENT));
  let x = WIDTH * 0.5;
  let y = 0;
  let d = `M ${x} ${y}`;

  for (let i = 0; i < segments; i++) {
    const swing = i % 2 === 0 ? 0.78 : 0.22;
    x = WIDTH * swing;
    y += SEGMENT;

    // occasional micro-jag for lightning feel
    if (i % 3 === 1) {
      const jagX = x + (i % 2 === 0 ? 12 : -12);
      const jagY = y - SEGMENT * 0.45;
      d += ` L ${jagX} ${jagY}`;
    }

    d += ` L ${x} ${y}`;

    // small fork branch every 4 segments
    if (i % 4 === 2 && y < totalHeight - SEGMENT) {
      const forkLen = SEGMENT * 0.35;
      const fx = x + (i % 2 === 0 ? forkLen : -forkLen);
      const fy = y - forkLen * 0.5;
      d += ` M ${x} ${y - SEGMENT * 0.2} L ${fx} ${fy}`;
      d += ` M ${x} ${y - SEGMENT * 0.2}`;
    }
  }

  return d;
}

function buildGlowPath(totalHeight: number): string {
  const segments = Math.max(8, Math.ceil(totalHeight / (SEGMENT * 1.4)));
  let x = WIDTH * 0.62;
  let y = 0;
  let d = `M ${x} ${y}`;

  for (let i = 0; i < segments; i++) {
    x = i % 2 === 0 ? WIDTH * 0.35 : WIDTH * 0.68;
    y += SEGMENT * 1.4;
    d += ` L ${x} ${y}`;
  }

  return d;
}

export default function ScrollLightning() {
  const uid = useId().replace(/:/g, "");
  const [docHeight, setDocHeight] = useState(3000);
  const [progress, setProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState(false);

  const mainPath = useMemo(() => buildLightningPath(docHeight), [docHeight]);
  const glowPath = useMemo(() => buildGlowPath(docHeight), [docHeight]);

  useEffect(() => {
    const measure = () => {
      const h = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        window.innerHeight * 3
      );
      setDocHeight(h);
    };

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0;
      setScrollY(scrollTop);
      setProgress(p);
      setVisible(scrollTop > 40);
    };

    measure();
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  const drawOffset = 1 - progress;
  const pulseY = progress * docHeight;

  return (
    <div
      className={`scroll-lightning ${visible ? "scroll-lightning-visible" : ""}`}
      aria-hidden
    >
      <div
        className="scroll-lightning-inner"
        style={{ height: docHeight, transform: `translateY(${-scrollY}px)` }}
      >
      <svg
        className="scroll-lightning-svg"
        viewBox={`0 0 ${WIDTH} ${docHeight}`}
        preserveAspectRatio="xMidYMin slice"
        style={{ height: docHeight }}
      >
        <defs>
          <linearGradient id={`${uid}-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,230,184,0.35)" />
            <stop offset="50%" stopColor="rgba(59,158,255,0.28)" />
            <stop offset="100%" stopColor="rgba(124,92,255,0.2)" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-80%" y="-2%" width="260%" height="104%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${uid}-spark`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* faint full trail */}
        <path
          d={mainPath}
          fill="none"
          stroke="rgba(0,230,184,0.04)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* secondary zigzag */}
        <path
          d={glowPath}
          fill="none"
          stroke="rgba(59,158,255,0.03)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 14"
        />

        {/* scroll-drawn lightning */}
        <path
          className="scroll-lightning-main"
          d={mainPath}
          fill="none"
          stroke={`url(#${uid}-grad)`}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={drawOffset}
          filter={`url(#${uid}-glow)`}
        />

        {/* soft core — not bright white */}
        <path
          d={mainPath}
          fill="none"
          stroke="rgba(0,230,184,0.12)"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={drawOffset}
        />

        {/* traveling spark at scroll head */}
        <circle
          className="scroll-lightning-spark"
          cx={WIDTH * (Math.floor(progress * 20) % 2 === 0 ? 0.78 : 0.22)}
          cy={pulseY}
          r={4}
          fill="rgba(0,230,184,0.4)"
          filter={`url(#${uid}-spark)`}
          opacity={progress > 0.02 && progress < 0.98 ? 0.5 : 0}
        />
      </svg>

      {/* right-side mirror (subtle) */}
      <svg
        className="scroll-lightning-svg scroll-lightning-svg-right"
        viewBox={`0 0 ${WIDTH} ${docHeight}`}
        preserveAspectRatio="xMidYMin slice"
        style={{ height: docHeight }}
      >
        <path
          d={glowPath}
          fill="none"
          stroke="rgba(0,230,184,0.04)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={drawOffset}
          transform={`scale(-1,1) translate(-${WIDTH},0)`}
        />
      </svg>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { PLATFORMS, APP, type Platform } from "@/lib/config";
import type { ResolvedDownload } from "@/lib/github";

interface ReleasePayload {
  version: string;
  releaseUrl: string;
  downloads: ResolvedDownload[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function detectPlatform(): Platform | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() ?? "";
  if (ua.includes("win") || platform.includes("win")) return "windows";
  if (ua.includes("mac") || platform.includes("mac")) return "macos";
  if (ua.includes("linux") || platform.includes("linux")) return "linux";
  return null;
}

export default function DownloadSection() {
  const { data } = useSWR<ReleasePayload>("/api/releases", fetcher, {
    refreshInterval: 120000,
  });
  const [detected, setDetected] = useState<Platform | null>(null);

  useEffect(() => {
    setDetected(detectPlatform());
  }, []);

  const resolved = data?.downloads ?? [];
  const terminal = PLATFORMS.find((p) => p.id === "terminal");

  return (
    <section id="download">
      <div className="container">
        <div className="section-head">
          <h2>Download for your platform</h2>
          <p>
            Version {data?.version ?? APP.releaseTag} — desktop builds appear automatically
            when published to GitHub Releases. Terminal install always available.
          </p>
        </div>

        <div className="download-grid">
          {PLATFORMS.filter((p) => p.id !== "terminal").map((p) => {
            const info = resolved.find((d) => d.platform === p.id);
            const available = info?.available ?? false;
            const recommended = detected === p.id;

            return (
              <article
                key={p.id}
                className={`download-card ${recommended ? "recommended" : ""}`}
              >
                <div className="download-card-head">
                  <span className="download-icon">{p.icon}</span>
                  <h3>{p.label}</h3>
                </div>
                <p>{p.description}</p>
                <div className="formats">
                  {p.formats.map((f) => (
                    <span key={f} className="format-tag">
                      {f}
                    </span>
                  ))}
                </div>
                <span className={`status-pill ${available ? "status-ready" : "status-soon"}`}>
                  {available
                    ? info?.filename ?? "Ready"
                    : "See GitHub Releases"}
                </span>
                <a
                  className="btn btn-primary"
                  href={`/api/download?platform=${p.id}`}
                >
                  Download for {p.label}
                </a>
                {recommended && (
                  <span className="format-tag" style={{ color: "var(--accent)" }}>
                    ✓ Detected your OS
                  </span>
                )}
              </article>
            );
          })}
        </div>

        {terminal && (
          <div className="install-box" style={{ marginTop: "1.5rem" }}>
            <h3 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
              {terminal.icon} {terminal.label}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "0.75rem" }}>
              {terminal.description}
            </p>
            <code>{terminal.installCommand}</code>
            <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <a className="btn btn-primary" href="/api/download?platform=terminal">
                Run install script
              </a>
              <a
                className="btn btn-ghost"
                href={`https://github.com/${APP.repo}/blob/main/desktop/README.md`}
                target="_blank"
                rel="noreferrer"
              >
                Desktop build guide
              </a>
            </div>
          </div>
        )}

        {data?.releaseUrl && (
          <p style={{ textAlign: "center", marginTop: "1.25rem", color: "var(--muted)", fontSize: "0.85rem" }}>
            All releases:{" "}
            <a href={data.releaseUrl} style={{ color: "var(--accent)" }}>
              {data.releaseUrl}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

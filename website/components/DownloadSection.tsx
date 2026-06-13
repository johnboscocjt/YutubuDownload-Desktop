"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { PLATFORMS, APP, type Platform } from "@/lib/config";
import type { ResolvedDownload } from "@/lib/github";
import { PLATFORM_ICONS, IconArrowRight } from "./svg/Icons";
import Reveal from "./Reveal";

interface ReleasePayload {
  version: string;
  releaseUrl: string;
  downloads: ResolvedDownload[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function downloadButtonLabel(platform: Platform): string {
  if (platform === "linux") return "Download .deb";
  if (platform === "windows") return "Download .exe";
  if (platform === "macos") return "Download .dmg";
  return "Download";
}

function downloadFilename(platform: Platform): string | undefined {
  if (platform === "linux") return APP.linuxDeb.filename;
  if (platform === "windows") return APP.windowsInstaller.filename;
  if (platform === "macos") return APP.macosDmg.filename;
  return undefined;
}

const INSTALL_GUIDE_HREFS: Partial<Record<Platform, string>> = {
  linux: "#linux-install",
  windows: "#windows-install",
  macos: "#macos-install",
};
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
  const TerminalIcon = PLATFORM_ICONS.terminal;

  return (
    <section id="download" className="section-download">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="section-tag">Get started</span>
            <h2>Download for your platform</h2>
            <p>
              Version {data?.version ?? APP.releaseTag} — Linux (.deb), Windows (.exe),
              and macOS (.dmg) installers available.{" "}
              <a href="#install-guides">Install &amp; uninstall guides</a> below.
            </p>
          </div>
        </Reveal>

        <div className="download-grid">
          {PLATFORMS.filter((p) => p.id !== "terminal").map((p, i) => {
            const info = resolved.find((d) => d.platform === p.id);
            const comingSoon = info?.comingSoon ?? p.comingSoon ?? false;
            const available = info?.available ?? false;
            const recommended = detected === p.id;
            const PlatformIcon = PLATFORM_ICONS[p.id];

            let statusLabel = "Building…";
            let statusClass = "status-soon";
            if (comingSoon) {
              statusLabel = "Coming soon";
              statusClass = "status-soon";
            } else if (available) {
              statusLabel = info?.filename ?? "Ready";
              statusClass = "status-ready";
            } else if (p.id === "linux") {
              statusLabel = "Release pending";
              statusClass = "status-soon";
            }

            return (
              <Reveal key={p.id} delay={i * 100}>
                <article
                  className={`download-card ${recommended ? "recommended" : ""} ${comingSoon ? "download-soon" : ""}`}
                >
                  <div className="download-card-glow" />
                  <div className="download-card-head">
                    <span className="download-icon">
                      <PlatformIcon size={28} />
                    </span>
                    <div>
                      <h3>{p.label}</h3>
                      {recommended && <span className="detected-badge">Detected OS</span>}
                    </div>
                  </div>
                  <p>{p.description}</p>
                  <div className="formats">
                    {p.formats.map((f) => (
                      <span key={f} className="format-tag">
                        {f}
                      </span>
                    ))}
                  </div>
                  <span className={`status-pill ${statusClass}`}>
                  {comingSoon ? statusLabel : available ? "Ready" : statusLabel}
                </span>
                  {comingSoon ? (
                    <span className="btn btn-disabled" aria-disabled="true">
                      Coming soon
                    </span>
                ) : available ? (
                  <>
                  <a
                    className="btn btn-primary btn-block"
                    href={`/api/download?platform=${p.id}`}
                    download={downloadFilename(p.id)}
                  >
                    {downloadButtonLabel(p.id)}
                    <IconArrowRight />
                  </a>
                  {INSTALL_GUIDE_HREFS[p.id] && (
                    <a className="download-guide-link" href={INSTALL_GUIDE_HREFS[p.id]}>
                      Install &amp; uninstall guide
                    </a>
                  )}
                  </>
                  ) : (
                    <a
                      className="btn btn-ghost btn-block"
                      href={`https://github.com/${APP.repo}/releases`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View releases on GitHub
                    </a>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>

        {terminal && (
          <Reveal delay={300}>
            <div className="install-box">
              <div className="install-box-head">
                <span className="install-icon">
                  <TerminalIcon size={26} />
                </span>
                <div>
                  <h3>{terminal.label}</h3>
                  <p>{terminal.description}</p>
                </div>
              </div>
              <code>{terminal.installCommand}</code>
              <div className="install-actions">
                <a className="btn btn-primary" href="/api/download?platform=terminal">
                  Run install script
                  <IconArrowRight />
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
          </Reveal>
        )}

        {data?.releaseUrl && (
          <p className="release-link">
            All releases:{" "}
            <a href={data.releaseUrl}>{data.releaseUrl}</a>
          </p>
        )}
      </div>
    </section>
  );
}

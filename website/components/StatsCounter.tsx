"use client";

import useSWR from "swr";
import type { DownloadStats } from "@/lib/stats";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function format(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export default function StatsCounter() {
  const { data } = useSWR<DownloadStats>("/api/stats", fetcher, {
    refreshInterval: 12000,
    revalidateOnFocus: true,
  });

  const total = data?.total;
  const site = data?.siteTracked ?? 0;
  const github = data?.githubRelease ?? 0;

  return (
    <div className="stats-bar">
      <div className="stat">
        <div className="stat-value" data-value={total ?? 0}>
          {total !== undefined ? format(total) : "—"}
        </div>
        <div className="stat-label">Total downloads</div>
      </div>
      <div className="stat-divider" />
      <div className="stat">
        <div className="stat-value">{format(site)}</div>
        <div className="stat-label">From this site</div>
      </div>
      <div className="stat-divider" />
      <div className="stat">
        <div className="stat-value">{format(github)}</div>
        <div className="stat-label">GitHub releases</div>
      </div>
      <div className="stat-divider" />
      <div className="stat stat-live">
        <span className="pulse-dot" aria-hidden />
        <div className="stat-label">Live</div>
      </div>
    </div>
  );
}

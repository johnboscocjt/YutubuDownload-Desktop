type IconProps = { className?: string; size?: number };

const S = ({ className, size = 24 }: IconProps) => ({
  className,
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
});

export function IconProbe({ className, size = 24 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconDesktop({ className, size = 24 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <rect x="2" y="4" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 9h10M7 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function IconSignal({ className, size = 24 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <path d="M2 20h2M6 16v4M10 12v8M14 8v12M18 4v16M22 2v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 18c3-4 6-4 9 0s6 4 9 0" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

export function IconPlaylist({ className, size = 24 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <rect x="3" y="5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19 8v8a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconLayers({ className, size = 24 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <path d="M12 3L3 8l9 5 9-5-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3 12l9 5 9-5M3 16l9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

export function IconOpenSource({ className, size = 24 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 9.5c.5-2 2.5-3 4-2.5 1.5.5 2 2.5 1 4-1 1.5-3 2-4.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="15" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconDownload({ className, size = 24 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <path d="M12 3v12M8 11l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconLink({ className, size = 24 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <path d="M10 13a4 4 0 0 0 5.7.3l2-2a4 4 0 0 0-5.7-5.7l-1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 11a4 4 0 0 0-5.7-.3l-2 2a4 4 0 0 0 5.7 5.7l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconRocket({ className, size = 24 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <path d="M12 2c0 0-5 3-5 9 0 2.5 1.5 4.5 3 6l2 5 2-5c1.5-1.5 3-3.5 3-6 0-6-5-9-5-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 19l2-2M19 19l-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function IconLinux({ className, size = 32 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <ellipse cx="12" cy="14" rx="7" ry="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" />
      <path d="M9 16c1 1.5 4 1.5 6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12 6V3M8 4l-1-2M16 4l1-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconWindows({ className, size = 32 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <path d="M3 5.5l7-1v7H3V5.5zM12 4.2l9-1.4v8.4H12V4.2zM3 13.5h7v7.5l-7-1V13.5zM12 13.5h9V22l-9-1.4V13.5z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

export function IconApple({ className, size = 32 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <path d="M16.5 3c-.3 1.8-1.2 3.3-2.6 4.2-1.1.7-2.4.5-3.7.2.3-1.7 1.2-3.1 2.5-4 1-.7 2.4-.8 3.8-.4z" fill="currentColor" />
      <path d="M12 7c-3.5 0-6.5 2.8-6.5 7.5 0 4.5 3 8.5 6.5 8.5s6.5-4 6.5-8.5C18.5 9.8 15.5 7 12 7z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconTerminal({ className, size = 32 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 9l3 3-3 3M11 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGithub({ className, size = 20 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <path
        d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.67.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.32.1-2.75 0 0 .84-.27 2.75 1.05A9.2 9.2 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.43.2 2.49.1 2.75.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.48A10.1 10.1 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconArrowRight({ className, size = 18 }: IconProps) {
  const p = S({ className, size });
  return (
    <svg {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const FEATURE_ICONS = {
  probe: IconProbe,
  desktop: IconDesktop,
  signal: IconSignal,
  playlist: IconPlaylist,
  layers: IconLayers,
  opensource: IconOpenSource,
} as const;

export const STEP_ICONS = [IconDownload, IconLink, IconRocket] as const;

export const PLATFORM_ICONS = {
  linux: IconLinux,
  windows: IconWindows,
  macos: IconApple,
  terminal: IconTerminal,
} as const;

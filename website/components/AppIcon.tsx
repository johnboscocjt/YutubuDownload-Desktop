import { APP } from "@/lib/config";

interface AppIconProps {
  size?: number;
  className?: string;
}

/** YutubuDownload app icon (from desktop/app-icon.png). */
export default function AppIcon({ size = 36, className = "" }: AppIconProps) {
  return (
    <img
      src="/icon-192.png"
      srcSet="/icon.png 128w, /icon-192.png 192w, /icon-512.png 512w"
      sizes={`${size}px`}
      alt={`${APP.name} icon`}
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}

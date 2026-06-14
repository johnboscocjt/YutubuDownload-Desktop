"use client";

import { useCallback, useEffect } from "react";

export interface LightboxImage {
  src: string;
  alt: string;
  title?: string;
}

interface ImageLightboxProps {
  image: LightboxImage | null;
  onClose: () => void;
}

export default function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!image) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [image, handleKey]);

  if (!image) return null;

  return (
    <div
      className="lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={image.title ?? image.alt}
      onClick={onClose}
    >
      <button
        type="button"
        className="lightbox-close"
        aria-label="Close"
        onClick={onClose}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <figure
        className="lightbox-figure"
        onClick={(e) => e.stopPropagation()}
      >
        {image.title && <figcaption className="lightbox-caption">{image.title}</figcaption>}
        <img src={image.src} alt={image.alt} className="lightbox-img" />
      </figure>
      <p className="lightbox-hint">Press Esc or click outside to close</p>
    </div>
  );
}

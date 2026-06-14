import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  title?: string;
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  onInteract?: () => void;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatPlaybackTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`;
  }
  return `${pad2(minutes)}:${pad2(secs)}`;
}

export default function PlayerProgressBar({
  title,
  position,
  duration,
  onSeek,
  onInteract,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);

  const displayPosition = scrubPosition ?? position;
  const safeDuration = duration > 0 ? duration : Math.max(displayPosition, 1);
  const percent = Math.min(100, Math.max(0, (displayPosition / safeDuration) * 100));
  const remaining = Math.max(0, safeDuration - displayPosition);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return ratio * safeDuration;
    },
    [safeDuration]
  );

  const finishSeek = useCallback(
    (clientX: number) => {
      const next = seekFromClientX(clientX);
      setScrubPosition(null);
      draggingRef.current = false;
      onSeek(next);
    },
    [onSeek, seekFromClientX]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      onInteract?.();
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      const next = seekFromClientX(event.clientX);
      setScrubPosition(next);
      onSeek(next);
    },
    [onInteract, onSeek, seekFromClientX]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      onInteract?.();
      setScrubPosition(seekFromClientX(event.clientX));
    },
    [onInteract, seekFromClientX]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      finishSeek(event.clientX);
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [finishSeek]
  );

  useEffect(() => {
    return () => {
      draggingRef.current = false;
    };
  }, []);

  return (
    <div className="player-progress">
      {title ? (
        <div className="player-progress-title" title={title}>
          {title}
        </div>
      ) : null}
      <div className="player-progress-row">
        <span className="player-progress-time" aria-hidden>
          {formatPlaybackTime(displayPosition)}
        </span>
        <div
          ref={trackRef}
          className="player-progress-track"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(safeDuration)}
          aria-valuenow={Math.round(displayPosition)}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            onInteract?.();
            const step = event.key === "ArrowLeft" ? -5 : 5;
            onSeek(Math.min(safeDuration, Math.max(0, displayPosition + step)));
          }}
        >
          <div className="player-progress-rail">
            <div className="player-progress-fill" style={{ width: `${percent}%` }} />
            <div className="player-progress-thumb" style={{ left: `${percent}%` }} />
          </div>
        </div>
        <span className="player-progress-remaining" aria-hidden>
          -{formatPlaybackTime(remaining)}
        </span>
      </div>
    </div>
  );
}

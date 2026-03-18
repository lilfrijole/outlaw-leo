"use client";

interface LivesIndicatorProps {
  credits: number;
}

export default function LivesIndicator({ credits }: LivesIndicatorProps) {
  if (credits <= 0) return null;

  return (
    <div className="lives-indicator">
      <img
        src="/game/assets/leo-sprite-2x.png"
        alt="Leo"
        className="lives-icon"
      />
      <span className="lives-count">x{credits}</span>
    </div>
  );
}

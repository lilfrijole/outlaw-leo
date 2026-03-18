"use client";

import { useState, useEffect } from "react";

interface TopEntry {
  initials: string;
  score: number;
}

export default function LeaderBadge() {
  const [top, setTop] = useState<TopEntry | null>(null);

  useEffect(() => {
    const fetchTop = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        if (data.entries && data.entries.length > 0) {
          setTop({ initials: data.entries[0].initials, score: data.entries[0].score });
        }
      } catch {
        // Silently fail
      }
    };
    fetchTop();
  }, []);

  if (!top) return null;

  return (
    <div className="leader-badge">
      <span className="leader-badge-crown">1ST</span>
      <span className="leader-badge-initials">{top.initials}</span>
      <span className="leader-badge-score">{String(top.score).padStart(5, "0")}</span>
    </div>
  );
}

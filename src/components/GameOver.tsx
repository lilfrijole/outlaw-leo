"use client";

import { useEffect } from "react";

interface GameOverProps {
  visible: boolean;
  score: number;
  onRestart: () => void;
}

/** Keyboard handler only — game-over art/text is drawn on the canvas. */
export default function GameOver({ visible, onRestart }: GameOverProps) {
  useEffect(() => {
    if (!visible) return;

    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.keyCode === 32) {
        e.preventDefault();
        onRestart();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onRestart]);

  return null;
}

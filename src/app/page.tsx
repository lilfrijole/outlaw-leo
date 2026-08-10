"use client";

import { useState, useCallback, useEffect } from "react";
import GameCanvas from "@/components/GameCanvas";
import GameOver from "@/components/GameOver";

export default function Home() {
  const [gameOverScore, setGameOverScore] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true);

  useEffect(() => {
    if (!showStartScreen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.keyCode === 32) {
        setShowStartScreen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showStartScreen]);

  const handleGameOver = useCallback((score: number) => {
    setGameOverScore(score);
    setShowGameOver(true);
  }, []);

  const handleRestart = useCallback(() => {
    setShowGameOver(false);
    if (window.Runner?.instance_) {
      window.Runner.instance_.restart();
    }
  }, []);

  return (
    <main className="game-page">
      {showStartScreen && (
        <div className="start-overlay">
          <div className="start-text">
            <h1 className="game-title">OUTLAW LEO</h1>
            <p className="game-subtitle">Don&apos;t let Leo get caught!</p>
            <p className="game-hint">Press Space to start</p>
          </div>
        </div>
      )}

      <GameCanvas
        onGameOver={handleGameOver}
        onGameReady={() => {}}
        onRestart={() => setShowGameOver(false)}
        overlayActive={showGameOver}
      />

      <GameOver
        visible={showGameOver}
        score={gameOverScore}
        onRestart={handleRestart}
      />
    </main>
  );
}

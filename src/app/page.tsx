"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import GameCanvas from "@/components/GameCanvas";
import Leaderboard from "@/components/Leaderboard";

export default function Home() {
  const { address, connected } = useWallet();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [gameOverScore, setGameOverScore] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gameReady, setGameReady] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true);

  useEffect(() => {
    if (connected && address) {
      setWalletAddress(address);
    }
  }, [connected, address]);

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

  const handleWalletConnected = useCallback((addr: string) => {
    setWalletAddress(addr);
  }, []);

  const handleGameOver = useCallback((score: number) => {
    setGameOverScore(score);
    setShowLeaderboard(true);
  }, []);

  const handleGameReady = useCallback(() => {
    setGameReady(true);
  }, []);

  const handleRestart = useCallback(() => {
    setShowLeaderboard(false);
    if (window.Runner?.instance_) {
      window.Runner.instance_.restart();
    }
  }, []);

  const handleLeaderboardClose = useCallback(() => {
    setShowLeaderboard(false);
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
        onGameReady={handleGameReady}
        onRestart={() => setShowLeaderboard(false)}
        overlayActive={showLeaderboard}
      />

      <Leaderboard
        visible={showLeaderboard}
        score={gameOverScore}
        walletAddress={walletAddress}
        onWalletConnected={handleWalletConnected}
        onClose={handleLeaderboardClose}
        onRestart={handleRestart}
      />
    </main>
  );
}

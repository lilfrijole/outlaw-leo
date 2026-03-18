"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";

interface LeaderboardEntry {
  id: string;
  wallet_address: string;
  initials: string;
  score: number;
}

interface LeaderboardProps {
  visible: boolean;
  score: number;
  walletAddress: string | null;
  onWalletConnected: (address: string) => void;
  onClose: () => void;
  onRestart: () => void;
}

export default function Leaderboard({
  visible,
  score,
  walletAddress,
  onWalletConnected,
  onClose,
  onRestart,
}: LeaderboardProps) {
  const { connected, connecting, address, wallets, selectWallet } = useWallet();
  const [connectError, setConnectError] = useState("");
  const [initials, setInitials] = useState(["_", "_", "_"]);
  const [cursorPos, setCursorPos] = useState(0);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pendingSave, setPendingSave] = useState(false);
  const initialsRef = useRef(initials);
  const cursorPosRef = useRef(cursorPos);

  initialsRef.current = initials;
  cursorPosRef.current = cursorPos;

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (data.entries) setEntries(data.entries);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setInitials(["_", "_", "_"]);
      setCursorPos(0);
      setSaved(false);
      setSaveError("");
      setConnectError("");
      setPendingSave(false);
      fetchLeaderboard();
    }
  }, [visible, fetchLeaderboard]);

  useEffect(() => {
    if (!visible) return;

    const handler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key.length === 1 && key >= "A" && key <= "Z") {
        e.preventDefault();
        e.stopPropagation();
        const pos = cursorPosRef.current;
        if (pos < 3) {
          const next = [...initialsRef.current];
          next[pos] = key;
          setInitials(next);
          setCursorPos(pos + 1);
        }
      } else if (e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        const pos = cursorPosRef.current;
        if (pos > 0) {
          const next = [...initialsRef.current];
          next[pos - 1] = "_";
          setInitials(next);
          setCursorPos(pos - 1);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [visible]);

  useEffect(() => {
    console.log("[Leaderboard] wallet state changed - connected:", connected, "connecting:", connecting, "address:", address);
    if (connected && address && !walletAddress) {
      console.log("[Leaderboard] wallet connected! Setting address:", address);
      onWalletConnected(address);
    }
  }, [connected, connecting, address, walletAddress, onWalletConnected]);

  // Auto-save after wallet connects if user had clicked "CONNECT WALLET & SAVE"
  useEffect(() => {
    if (pendingSave && walletAddress && !saved && !saving) {
      console.log("[Leaderboard] pending save triggered, wallet now available:", walletAddress);
      setPendingSave(false);
      doSave(walletAddress);
    }
  }, [pendingSave, walletAddress, saved, saving]);

  const doSave = async (addr: string) => {
    setSaving(true);
    setSaveError("");
    try {
      console.log("[Leaderboard] saving score:", { addr, initials: initialsRef.current.join(""), score });
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: addr,
          initials: initialsRef.current.join(""),
          score,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log("[Leaderboard] save success:", data);
        setSaved(true);
        await fetchLeaderboard();
      } else {
        console.error("[Leaderboard] save failed:", data);
        setSaveError(data.error || "Failed to save score");
      }
    } catch (err) {
      console.error("[Leaderboard] save error:", err);
      setSaveError("Network error saving score");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectWallet = () => {
    setConnectError("");
    console.log("[Leaderboard] handleConnectWallet called");
    console.log("[Leaderboard] wallets available:", wallets.length, wallets.map(w => w.adapter.name));
    console.log("[Leaderboard] connected:", connected, "connecting:", connecting, "address:", address);
    const firstWallet = wallets[0];
    if (firstWallet) {
      console.log("[Leaderboard] selecting wallet:", firstWallet.adapter.name);
      selectWallet(firstWallet.adapter.name);
    } else {
      console.log("[Leaderboard] NO wallets found");
      setConnectError("No wallet adapters found. Please install Shield Wallet and refresh.");
    }
  };

  const handleSave = async () => {
    if (cursorPos < 3 || saved) return;

    if (!walletAddress) {
      handleConnectWallet();
      setPendingSave(true);
      return;
    }

    await doSave(walletAddress);
  };

  const handlePlayAgain = () => {
    onClose();
    onRestart();
  };

  if (!visible) return null;

  return (
    <div
      className="leaderboard-overlay"
      style={{ display: "flex" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="leaderboard-panel">
        <h2 className="lb-title">LEO GOT CAUGHT!</h2>
        <div className="lb-score">
          SCORE: <span>{String(score).padStart(5, "0")}</span>
        </div>

        <div className="lb-initials-section">
          <p className="lb-initials-label">TYPE YOUR INITIALS</p>
          <div className="lb-initials-picker">
            {initials.map((letter, i) => (
              <span
                key={i}
                className={`lb-letter${i === cursorPos ? " lb-letter-active" : ""}`}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>

        <button
          className={`lb-btn lb-save-btn${!walletAddress ? " wallet-needed" : ""}`}
          onClick={handleSave}
          disabled={cursorPos < 3 || saved || saving || connecting}
        >
          {saved
            ? "SAVED!"
            : saving
              ? "SAVING..."
              : connecting
                ? "CONNECTING..."
                : walletAddress
                  ? "SAVE SCORE"
                  : "CONNECT WALLET & SAVE"}
        </button>

        {(connectError || saveError) && (
          <div className="lb-wallet-status" style={{ color: "#ff1493" }}>
            {connectError || saveError}
          </div>
        )}

        {walletAddress && !connectError && !saveError && (
          <div className="lb-wallet-status">
            Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </div>
        )}

        <div className="lb-board-section">
          <h3 className="lb-board-title">TOP SCORES</h3>
          <ol className="lb-board-list">
            {entries.length === 0 ? (
              <li style={{ justifyContent: "center", color: "#666" }}>
                NO SCORES YET
              </li>
            ) : (
              entries.slice(0, 10).map((entry, i) => (
                <li
                  key={entry.id}
                  className={
                    entry.score === score &&
                    entry.initials === initials.join("") &&
                    entry.wallet_address === walletAddress
                      ? "lb-highlight"
                      : ""
                  }
                >
                  <span className="lb-rank">{i + 1}.</span>
                  <span className="lb-entry-initials">{entry.initials}</span>
                  <span className="lb-entry-score">
                    {String(entry.score).padStart(5, "0")}
                  </span>
                </li>
              ))
            )}
          </ol>
        </div>

        <button className="lb-btn lb-play-btn" onClick={handlePlayAgain}>
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}

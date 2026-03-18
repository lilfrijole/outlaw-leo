"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useShieldWallet } from "@/components/WalletProvider";

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

// Row height in px (padding + font + border) — must match CSS
const ROW_HEIGHT = 28;

export default function Leaderboard({
  visible,
  score,
  walletAddress,
  onWalletConnected,
  onClose,
  onRestart,
}: LeaderboardProps) {
  const { shieldDetected, address, network, connecting, connectError, connect } = useShieldWallet();
  const [initials, setInitials] = useState(["_", "_", "_"]);
  const [cursorPos, setCursorPos] = useState(0);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pendingSave, setPendingSave] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [visibleStart, setVisibleStart] = useState(0);
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
      setPendingSave(false);
      setShowWalletModal(false);
      setVisibleStart(0);
      fetchLeaderboard();
    }
  }, [visible, fetchLeaderboard]);

  // Smooth upward scroll: hold top 3 for 3s, then scroll up one row
  // every 2s. After reaching the end, pause 3s, then reset to top and repeat.
  useEffect(() => {
    if (!visible || entries.length <= 3) return;
    const total = Math.min(entries.length, 10);
    const maxStart = Math.max(0, total - 3);

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const startCycle = () => {
      intervalId = setInterval(() => {
        setVisibleStart((prev) => {
          const next = prev + 1;
          if (next > maxStart) {
            // Reached the end — pause, then restart from top
            if (intervalId) clearInterval(intervalId);
            intervalId = null;
            resetTimer = setTimeout(() => {
              setVisibleStart(0);
              // Restart after resetting to top
              resetTimer = setTimeout(startCycle, 3000);
            }, 3000);
            return prev;
          }
          return next;
        });
      }, 2000);
    };

    // Initial hold on top 3
    const initTimer = setTimeout(startCycle, 3000);

    return () => {
      clearTimeout(initTimer);
      if (intervalId) clearInterval(intervalId);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [visible, entries.length]);

  useEffect(() => {
    if (!visible) return;

    const handler = (e: KeyboardEvent) => {
      if (showWalletModal) return;
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
  }, [visible, showWalletModal]);

  useEffect(() => {
    if (address && !walletAddress) {
      onWalletConnected(address);
    }
  }, [address, walletAddress, onWalletConnected]);

  // Auto-save + close modal after wallet connects
  useEffect(() => {
    if (pendingSave && walletAddress && !saved && !saving) {
      setPendingSave(false);
      setShowWalletModal(false);
      doSave(walletAddress);
    }
  }, [pendingSave, walletAddress, saved, saving]);

  // Close modal once connected
  useEffect(() => {
    if (walletAddress && showWalletModal) {
      setShowWalletModal(false);
    }
  }, [walletAddress, showWalletModal]);

  const doSave = async (addr: string) => {
    setSaving(true);
    setSaveError("");
    try {
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
        setSaved(true);
        await fetchLeaderboard();
      } else {
        setSaveError(data.error || "Failed to save score");
      }
    } catch {
      setSaveError("Network error saving score");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectFromModal = async () => {
    await connect();
    setPendingSave(true);
  };

  const handleSave = async () => {
    if (cursorPos < 3 || saved) return;

    if (!walletAddress) {
      setShowWalletModal(true);
      return;
    }

    if (network && network !== "testnet") {
      setSaveError("Switch to testnet to submit scores.");
      return;
    }

    await doSave(walletAddress);
  };

  const handlePlayAgain = () => {
    onClose();
    onRestart();
  };

  if (!visible) return null;

  const isNotTestnet = network && network !== "testnet";

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

        {isNotTestnet && walletAddress && (
          <div className="lb-wallet-status" style={{ color: "#ffaa00" }}>
            Warning: connected to {network} — switch to testnet for score submission
          </div>
        )}

        <button
          className={`lb-btn lb-save-btn${!walletAddress ? " wallet-needed" : ""}`}
          onClick={handleSave}
          disabled={cursorPos < 3 || saved || saving || connecting || (!!isNotTestnet && !!walletAddress)}
        >
          {saved
            ? "SAVED!"
            : saving
              ? "SAVING..."
              : connecting
                ? "CONNECTING..."
                : walletAddress
                  ? "SAVE SCORE"
                  : "JOIN LEADERBOARD"}
        </button>

        {saveError && (
          <div className="lb-wallet-status" style={{ color: "#ff1493" }}>
            {saveError}
          </div>
        )}

        {walletAddress && !saveError && (
          <div className="lb-wallet-status">
            Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>
        )}

        <div className="lb-board-section">
          <h3 className="lb-board-title">TOP SCORES</h3>
          <div className="lb-board-viewport">
            <ol
              className="lb-board-list"
              style={{
                transform: `translateY(-${visibleStart * ROW_HEIGHT}px)`,
                transition: "transform 0.5s ease-in-out",
              }}
            >
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
        </div>

        <button className="lb-btn lb-play-btn" onClick={handlePlayAgain}>
          PLAY AGAIN
        </button>
      </div>

      {/* Wallet connect modal — portaled to body so it escapes stacking contexts */}
      {showWalletModal && createPortal(
        <div className="wallet-modal-overlay" onMouseDown={() => setShowWalletModal(false)}>
          <div className="wallet-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button
              className="wallet-modal-close"
              onClick={() => setShowWalletModal(false)}
              aria-label="Close"
            >
              X
            </button>

            <div className="wallet-modal-header">
              <h3 className="wallet-modal-title">CONNECT WALLET</h3>
              <p className="wallet-modal-subtitle">to join the leaderboard</p>
            </div>

            {shieldDetected ? (
              <button
                className="wallet-modal-option"
                onClick={handleConnectFromModal}
                disabled={connecting}
              >
                <span className="wallet-modal-icon">
                  <svg width="32" height="32" viewBox="0 0 512 512" fill="none">
                    <rect width="512" height="512" fill="#222" rx="80"/>
                    <path d="M124.6 278.4V113.4H256.2V428.6C255.3 428.2 124.6 381.6 124.6 278.4Z" fill="url(#sg1)"/>
                    <path d="M387.8 278.4V113.4H256.2V428.6C257.1 428.2 387.8 381.6 387.8 278.4Z" fill="url(#sg2)"/>
                    <defs>
                      <linearGradient id="sg1" x1="190" y1="113" x2="190" y2="429" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#fff"/><stop offset="1" stopColor="#fff" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="sg2" x1="322" y1="113" x2="322" y2="429" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#fff"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <span className="wallet-modal-info">
                  <span className="wallet-modal-name">Shield Wallet</span>
                  <span className="wallet-modal-badge wallet-modal-detected">
                    {connecting ? "Connecting..." : "Detected"}
                  </span>
                </span>
              </button>
            ) : (
              <a
                href="https://www.shield.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="wallet-modal-option"
              >
                <span className="wallet-modal-icon">
                  <svg width="32" height="32" viewBox="0 0 512 512" fill="none">
                    <rect width="512" height="512" fill="#222" rx="80"/>
                    <path d="M124.6 278.4V113.4H256.2V428.6C255.3 428.2 124.6 381.6 124.6 278.4Z" fill="url(#sg1b)"/>
                    <path d="M387.8 278.4V113.4H256.2V428.6C257.1 428.2 387.8 381.6 387.8 278.4Z" fill="url(#sg2b)"/>
                    <defs>
                      <linearGradient id="sg1b" x1="190" y1="113" x2="190" y2="429" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#fff"/><stop offset="1" stopColor="#fff" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="sg2b" x1="322" y1="113" x2="322" y2="429" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#fff"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <span className="wallet-modal-info">
                  <span className="wallet-modal-name">Shield Wallet</span>
                  <span className="wallet-modal-badge wallet-modal-install">Not detected</span>
                </span>
              </a>
            )}

            {!shieldDetected && (
              <p className="wallet-modal-hint">
                Click above to install the Shield browser extension, then refresh this page.
              </p>
            )}

            {connectError && (
              <p className="wallet-modal-error">{connectError}</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

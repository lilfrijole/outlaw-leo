"use client";

import { useRef, useEffect, useCallback } from "react";
import { AUDIO_PRESS, AUDIO_HIT, AUDIO_REACHED } from "@/lib/audio-data";

declare global {
  interface Window {
    Runner: {
      new (selector: string, config?: unknown): RunnerInstance;
      instance_: RunnerInstance | null;
    };
    __OUTLAW_LEO__: OutlawLeoBridge;
  }
}

interface RunnerInstance {
  restart: () => void;
  destroy: () => void;
  crashed: boolean;
  raqId: number;
}

export interface OutlawLeoBridge {
  hasCredits: () => boolean;
  useCredit: () => void;
  getCredits: () => number;
  onGameOver: (score: number) => void;
  onGameReady: () => void;
  onRestart: () => void;
  isOverlayActive: () => boolean;
}

interface GameCanvasProps {
  onGameOver: (score: number) => void;
  onGameReady: () => void;
  onRestart: () => void;
  overlayActive: boolean;
}

function injectAudioTemplate() {
  const existing = document.getElementById("audio-resources");
  if (existing) return;

  const resources = document.getElementById("offline-resources");
  if (!resources) return;

  const template = document.createElement("template");
  template.id = "audio-resources";
  template.innerHTML = `
    <audio id="offline-sound-press" src="${AUDIO_PRESS}"></audio>
    <audio id="offline-sound-hit" src="${AUDIO_HIT}"></audio>
    <audio id="offline-sound-reached" src="${AUDIO_REACHED}"></audio>
  `;
  resources.appendChild(template);
}

export default function GameCanvas({
  onGameOver,
  onGameReady,
  onRestart,
  overlayActive,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const overlayActiveRef = useRef(overlayActive);

  overlayActiveRef.current = overlayActive;

  const stableOnGameOver = useCallback(
    (score: number) => onGameOver(score),
    [onGameOver]
  );
  const stableOnGameReady = useCallback(() => onGameReady(), [onGameReady]);
  const stableOnRestart = useCallback(() => onRestart(), [onRestart]);

  useEffect(() => {
    window.__OUTLAW_LEO__ = {
      hasCredits: () => true,
      useCredit: () => {},
      getCredits: () => 1,
      onGameOver: (score: number) => stableOnGameOver(score),
      onGameReady: () => stableOnGameReady(),
      onRestart: () => stableOnRestart(),
      isOverlayActive: () => overlayActiveRef.current,
    };
  }, [
    stableOnGameOver,
    stableOnGameReady,
    stableOnRestart,
  ]);

  useEffect(() => {
    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "/game/game.css";
    document.head.appendChild(cssLink);

    injectAudioTemplate();

    const script = document.createElement("script");
    script.src = "/game/game.js?v=gameover-polish-4";
    script.onload = () => {
      if (window.Runner && containerRef.current) {
        new window.Runner(".interstitial-wrapper");
      }
    };
    document.body.appendChild(script);

    return () => {
      if (window.Runner?.instance_) {
        window.Runner.instance_.destroy();
      }
    };
  }, []);

  return (
    <div
      id="main-frame-error"
      className="interstitial-wrapper"
      ref={containerRef}
    >
      <div id="main-content">
        <div className="icon icon-offline" />
      </div>
      <div id="offline-resources" style={{ display: "none" }}>
        <img
          id="offline-resources-1x"
          src="/game/assets/default_100_percent/100-offline-sprite.png"
          alt=""
        />
        <img
          id="offline-resources-2x"
          src="/game/assets/default_200_percent/200-offline-sprite.png"
          alt=""
        />
        <img id="leo-sprite-1x" src="/game/assets/leo-sprite-1x.png" alt="" />
        <img id="leo-sprite-2x" src="/game/assets/leo-sprite-2x.png" alt="" />
      </div>
    </div>
  );
}

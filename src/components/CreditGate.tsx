"use client";

import { useState, useEffect, useRef } from "react";
import { useShieldWallet } from "@/components/WalletProvider";
import {
  TREASURY_ADDRESS,
  CREDIT_COST_MICROCREDITS,
  PLAYS_PER_CREDIT,
} from "@/lib/constants";

interface CreditGateProps {
  credits: number;
  walletAddress: string | null;
  onCreditsUpdated: (credits: number) => void;
  onWalletConnected: (address: string) => void;
}

export default function CreditGate({
  credits,
  walletAddress,
  onCreditsUpdated,
  onWalletConnected,
}: CreditGateProps) {
  const { shieldDetected, address, network, connecting, connectError, connect, executeTransaction } =
    useShieldWallet();
  const [status, setStatus] = useState("");
  const [buying, setBuying] = useState(false);
  const creditsFetched = useRef(false);

  useEffect(() => {
    if (address && !walletAddress) {
      onWalletConnected(address);
    }
  }, [address, walletAddress, onWalletConnected]);

  useEffect(() => {
    if (address && !creditsFetched.current) {
      creditsFetched.current = true;
      fetchCredits(address);
    }
  }, [address]);

  const handleConnect = async () => {
    setStatus("");
    await connect();
  };

  const fetchCredits = async (addr: string) => {
    try {
      const res = await fetch(`/api/credits?wallet=${addr}`);
      const data = await res.json();
      if (data.credits !== undefined) {
        onCreditsUpdated(data.credits);
      }
    } catch {
      // Silently fail
    }
  };

  const handleBuyCredits = async () => {
    if (!walletAddress) return;
    setBuying(true);
    setStatus("Requesting payment...");

    try {
      const result = await executeTransaction({
        program: "credits.aleo",
        function: "transfer_public",
        inputs: [TREASURY_ADDRESS, `${CREDIT_COST_MICROCREDITS}u64`],
        fee: 10000,
      });

      if (!result?.transactionId) {
        setStatus("Transaction cancelled or failed.");
        setBuying(false);
        return;
      }

      setStatus("Verifying payment...");
      const verifyRes = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          txHash: result.transactionId,
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok) {
        onCreditsUpdated(verifyData.credits);
        setStatus(
          `+${PLAYS_PER_CREDIT} plays added!${verifyData.verified ? "" : " (pending on-chain confirmation)"}`
        );
      } else {
        setStatus(verifyData.error || "Verification failed");
      }
    } catch (err) {
      setStatus(
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setBuying(false);
    }
  };

  if (credits > 0) return null;

  return (
    <div className="credit-gate">
      <div className="credit-gate-panel">
        <h2 className="credit-gate-title">OUTLAW LEO</h2>
        <p className="credit-gate-sub">Arcade Mode</p>

        {!walletAddress ? (
          <>
            {shieldDetected ? (
              <>
                <p className="credit-gate-desc">
                  Connect your Shield Wallet to play
                </p>
                <button
                  className="credit-gate-btn credit-gate-connect"
                  onClick={handleConnect}
                  disabled={connecting}
                >
                  {connecting ? "CONNECTING..." : "CONNECT WALLET"}
                </button>
              </>
            ) : (
              <>
                <p className="credit-gate-desc">
                  You need Shield Wallet to play
                </p>
                <a
                  href="https://www.shield.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="credit-gate-btn credit-gate-connect"
                >
                  INSTALL SHIELD WALLET
                </a>
              </>
            )}
          </>
        ) : (
          <>
            {network && network !== "testnet" && (
              <p className="credit-gate-status" style={{ color: "#ffaa00" }}>
                Warning: connected to {network} — switch to testnet for score submission
              </p>
            )}
            <p className="credit-gate-desc">
              {PLAYS_PER_CREDIT} plays for 1 Aleo Credit
            </p>
            <button
              className="credit-gate-btn credit-gate-buy"
              onClick={handleBuyCredits}
              disabled={buying}
            >
              {buying ? "PROCESSING..." : `BUY ${PLAYS_PER_CREDIT} PLAYS`}
            </button>
            <p className="credit-gate-wallet">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </>
        )}

        {connectError && (
          <p className="credit-gate-status" style={{ color: "#ff1493" }}>{connectError}</p>
        )}
        {status && <p className="credit-gate-status">{status}</p>}
      </div>
    </div>
  );
}

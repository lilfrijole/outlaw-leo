"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
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
  const {
    connected,
    connecting,
    address,
    wallets,
    selectWallet,
    executeTransaction,
  } = useWallet();
  const [status, setStatus] = useState("");
  const [buying, setBuying] = useState(false);
  const creditsFetched = useRef(false);

  useEffect(() => {
    if (connected && address && !walletAddress) {
      onWalletConnected(address);
    }
  }, [connected, address, walletAddress, onWalletConnected]);

  useEffect(() => {
    if (connected && address && !creditsFetched.current) {
      creditsFetched.current = true;
      fetchCredits(address);
    }
  }, [connected, address]);

  const handleConnect = () => {
    console.log("[CreditGate] handleConnect called");
    console.log("[CreditGate] wallets available:", wallets.length, wallets.map(w => w.adapter.name));
    console.log("[CreditGate] connected:", connected, "connecting:", connecting, "address:", address);
    const firstWallet = wallets[0];
    if (firstWallet) {
      console.log("[CreditGate] selecting wallet:", firstWallet.adapter.name);
      setStatus("Connecting wallet...");
      selectWallet(firstWallet.adapter.name);
    } else {
      console.log("[CreditGate] NO wallets found");
      setStatus("No wallet adapters found. Please install Shield Wallet and refresh.");
    }
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
    if (!walletAddress || !connected) return;
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
              {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
            </p>
          </>
        )}

        {status && <p className="credit-gate-status">{status}</p>}
      </div>
    </div>
  );
}

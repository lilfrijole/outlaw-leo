"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

interface WalletContextValue {
  shieldDetected: boolean;
  address: string | null;
  network: string | null;
  connecting: boolean;
  connectError: string | null;
  connect: () => Promise<string | null>;
  executeTransaction: (params: {
    program: string;
    function: string;
    inputs: string[];
    fee: number;
  }) => Promise<{ transactionId?: string }>;
}

const WalletContext = createContext<WalletContextValue>({
  shieldDetected: false,
  address: null,
  network: null,
  connecting: false,
  connectError: null,
  connect: async () => null,
  executeTransaction: async () => ({}),
});

export function useShieldWallet() {
  return useContext(WalletContext);
}

const TARGET_NETWORK =
  process.env.NEXT_PUBLIC_ALEO_NETWORK === "mainnet" ? "mainnet" : "testnet";

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [shieldDetected, setShieldDetected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const listenersAttached = useRef(false);

  useEffect(() => {
    // Shield injects window.shield — poll for it since injection can be slow
    const check = () => {
      if (typeof window !== "undefined" && window.shield !== undefined) {
        setShieldDetected(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    // Retry a few times for slow extension injection
    const t1 = setTimeout(check, 300);
    const t2 = setTimeout(check, 800);
    const t3 = setTimeout(check, 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const attachListeners = useCallback(() => {
    if (listenersAttached.current || !window.shield) return;
    listenersAttached.current = true;
    window.shield.on("networkChanged", (net) => {
      setNetwork(net as string);
    });
    window.shield.on("accountChanged", () => {
      setAddress(null);
      setNetwork(null);
      listenersAttached.current = false;
    });
    window.shield.on("disconnect", () => {
      setAddress(null);
      setNetwork(null);
      listenersAttached.current = false;
    });
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    if (!window.shield) return null;
    setConnecting(true);
    setConnectError(null);

    // Strategy: try connecting with the user's current network first (avoids
    // the "Dapp not connected or connection expired" error that happens when
    // Shield tries to switch networks before a session exists).  If that
    // fails, fall back to an explicit target-network request.
    const attempts: Array<[string | undefined, string]> = [
      [undefined, "current network"],
      [TARGET_NETWORK, TARGET_NETWORK],
    ];

    for (const [net, label] of attempts) {
      try {
        const args: [string | undefined, string, string[]] = [
          net,
          "UponRequest",
          ["credits.aleo"],
        ];
        const result = await window.shield.connect(...args);
        const addr = result?.address ?? null;
        if (addr) {
          setAddress(addr);
          // If we connected without specifying a network, we don't know
          // which one Shield picked — default to what Shield reports via
          // the networkChanged event, or assume TARGET_NETWORK for now.
          setNetwork(net ?? TARGET_NETWORK);
          attachListeners();
          return addr;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[WalletProvider] connect attempt (${label}) failed:`, msg);
        // If this was the first attempt, continue to the fallback
        if (net === undefined) continue;
        // Final attempt failed — surface a helpful error
        if (msg.includes("not connected") || msg.includes("expired")) {
          setConnectError(
            "Please open the Shield extension and unlock your wallet, then try again."
          );
        } else if (msg.includes("reject") || msg.includes("denied")) {
          setConnectError("Connection was rejected.");
        } else {
          setConnectError(msg);
        }
      }
    }

    setConnecting(false);
    return null;
  }, [attachListeners]);

  const executeTransaction = useCallback(
    async (params: {
      program: string;
      function: string;
      inputs: string[];
      fee: number;
    }) => {
      if (!window.shield) throw new Error("Shield wallet not available");
      const result = await window.shield.executeTransaction({
        ...params,
        network: network ?? TARGET_NETWORK,
      });
      return result;
    },
    [network]
  );

  return (
    <WalletContext.Provider
      value={{
        shieldDetected,
        address,
        network,
        connecting,
        connectError,
        connect,
        executeTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

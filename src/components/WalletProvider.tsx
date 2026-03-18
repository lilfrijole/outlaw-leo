"use client";

import { useMemo, type ReactNode } from "react";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletModalProvider } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { Network } from "@provablehq/aleo-types";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";

import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";

export default function WalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new ShieldWalletAdapter()], []);

  const network =
    process.env.NEXT_PUBLIC_ALEO_NETWORK === "mainnet"
      ? Network.MAINNET
      : Network.TESTNET;

  return (
    <AleoWalletProvider
      wallets={wallets}
      network={network}
      decryptPermission={DecryptPermission.UponRequest}
      autoConnect={true}
      programs={["credits.aleo"]}
      onError={(error) => {
        console.error("[WalletProvider] onError:", error.message, error);
      }}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </AleoWalletProvider>
  );
}

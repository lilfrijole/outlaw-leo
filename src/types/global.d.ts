interface ShieldWalletAPI {
  connect(
    network: string | undefined,
    decryptPermission: string,
    programs: string[]
  ): Promise<{ address: string }>;
  disconnect(): Promise<void>;
  executeTransaction(params: {
    program: string;
    function: string;
    inputs: string[];
    fee: number;
    network: string;
  }): Promise<{ transactionId?: string }>;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
}

interface Window {
  shield?: ShieldWalletAPI;
}

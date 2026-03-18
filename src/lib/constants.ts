export const ALEO_NETWORK =
  (process.env.NEXT_PUBLIC_ALEO_NETWORK as string) || "testnet";

export const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "";

export const CREDIT_COST_MICROCREDITS = Number(
  process.env.NEXT_PUBLIC_CREDIT_COST_MICROCREDITS || "1000000"
);

export const PLAYS_PER_CREDIT = Number(
  process.env.NEXT_PUBLIC_PLAYS_PER_CREDIT || "5"
);

export const ALEO_API_BASE_URL =
  process.env.ALEO_API_BASE_URL || "https://api.explorer.provable.com/v1";

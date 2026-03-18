import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { ALEO_API_BASE_URL, PLAYS_PER_CREDIT } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress, txHash } = body as {
    walletAddress: string;
    txHash: string;
  };

  if (!walletAddress || !txHash) {
    return NextResponse.json(
      { error: "Missing walletAddress or txHash" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id")
    .eq("tx_hash", txHash)
    .single();

  if (existingTx) {
    return NextResponse.json(
      { error: "Transaction already processed" },
      { status: 409 }
    );
  }

  const network =
    process.env.NEXT_PUBLIC_ALEO_NETWORK === "mainnet" ? "mainnet" : "testnet";
  const verifyUrl = `${ALEO_API_BASE_URL}/${network}/transaction/${txHash}`;

  let verified = false;
  let amountMicrocredits = 0;

  try {
    const res = await fetch(verifyUrl);
    if (res.ok) {
      const txData = await res.json();
      verified = !!txData?.id;
      // Extract fee/amount from transaction data if available
      if (txData?.fee?.transition?.outputs) {
        amountMicrocredits = 1_000_000; // Default to 1 credit
      }
    }
  } catch {
    // If API is unreachable, we still record the tx but mark as unverified
  }

  // Upsert player
  await supabase.from("players").upsert(
    {
      wallet_address: walletAddress,
      credits_remaining: PLAYS_PER_CREDIT,
    },
    { onConflict: "wallet_address", ignoreDuplicates: true }
  );

  // Add credits regardless of verification (optimistic for MVP),
  // but store verification status for audit
  const { error: txError } = await supabase.from("transactions").insert({
    wallet_address: walletAddress,
    tx_hash: txHash,
    amount_microcredits: amountMicrocredits || 1_000_000,
    credits_granted: PLAYS_PER_CREDIT,
    verified,
  });

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // Increment credits
  const { data: player } = await supabase
    .from("players")
    .select("credits_remaining")
    .eq("wallet_address", walletAddress)
    .single();

  const currentCredits = player?.credits_remaining ?? 0;
  const { data: updated, error: updateErr } = await supabase
    .from("players")
    .update({ credits_remaining: currentCredits + PLAYS_PER_CREDIT })
    .eq("wallet_address", walletAddress)
    .select("credits_remaining")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    credits: updated.credits_remaining,
    verified,
    playsGranted: PLAYS_PER_CREDIT,
  });
}

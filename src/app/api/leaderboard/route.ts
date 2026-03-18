import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("id, wallet_address, initials, score, created_at")
    .order("score", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress, initials, score } = body as {
    walletAddress: string;
    initials: string;
    score: number;
  };

  if (
    !walletAddress ||
    !initials ||
    initials.length !== 3 ||
    typeof score !== "number"
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error: upsertError } = await supabase
    .from("players")
    .upsert(
      { wallet_address: walletAddress, credits_remaining: 0 },
      { onConflict: "wallet_address", ignoreDuplicates: true }
    );

  if (upsertError) {
    console.error("[leaderboard] player upsert failed:", upsertError.message);
    return NextResponse.json(
      { error: "Failed to register player" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("leaderboard")
    .insert({
      wallet_address: walletAddress,
      initials: initials.toUpperCase(),
      score,
    })
    .select()
    .single();

  if (error) {
    console.error("[leaderboard] insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entry: data });
}

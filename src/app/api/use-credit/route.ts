import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress } = body as { walletAddress: string };

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Missing walletAddress" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: player, error: fetchErr } = await supabase
    .from("players")
    .select("credits_remaining")
    .eq("wallet_address", walletAddress)
    .single();

  if (fetchErr || !player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (player.credits_remaining <= 0) {
    return NextResponse.json({ error: "No credits remaining" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("players")
    .update({ credits_remaining: player.credits_remaining - 1 })
    .eq("wallet_address", walletAddress)
    .select("credits_remaining")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ credits: data.credits_remaining });
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json(
      { error: "Missing wallet parameter" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("players")
    .select("credits_remaining")
    .eq("wallet_address", wallet)
    .single();

  if (error && error.code === "PGRST116") {
    return NextResponse.json({ credits: 0, isNewPlayer: true });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ credits: data.credits_remaining });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL    = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";
const BOT_SECRET = process.env.NOTIFICATION_BOT_SECRET || "";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).single();

    if (!profile || !BOT_URL) return new NextResponse(null, { status: 204 });

    const kostId = profile.id;

    const res = await fetch(`${BOT_URL}/qr-image/${kostId}`, {
      headers: { "Authorization": `Bearer ${BOT_SECRET}`, "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return new NextResponse(null, { status: 204 });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });

  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

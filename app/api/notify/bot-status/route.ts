import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL    = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";
const BOT_SECRET = process.env.NOTIFICATION_BOT_SECRET || "";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ambil kostId milik user ini
    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).single();

    if (!profile) return NextResponse.json({ status: "idle", phone: null, qr_available: false, has_session: false, uptime: "0s" });

    const kostId = profile.id;

    if (!BOT_URL) return NextResponse.json({ status: "idle", phone: null, qr_available: false, has_session: false, uptime: "0s" });

    const res = await fetch(`${BOT_URL}/api/status/${kostId}`, {
      headers: { "Authorization": `Bearer ${BOT_SECRET}`, "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ status: "idle", phone: null, qr_available: false, has_session: false, uptime: "0s" });

    const data = await res.json();
    return NextResponse.json(data);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[bot-status]", msg);
    return NextResponse.json({ status: "idle", phone: null, qr_available: false, has_session: false, uptime: "0s" });
  }
}

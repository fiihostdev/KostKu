import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!BOT_URL) {
    return NextResponse.json({
      status: "idle",
      phone: null,
      qr_available: false,
      has_session: false,
      uptime: "0s",
      error: "Bot URL tidak dikonfigurasi di environment",
    });
  }

  try {
    const res = await fetch(`${BOT_URL}/`, {
      signal: AbortSignal.timeout(5000),
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      return NextResponse.json({ status: "idle", phone: null, qr_available: false, has_session: false });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      status: "idle",
      phone: null,
      qr_available: false,
      has_session: false,
      uptime: "0s",
    });
  }
}

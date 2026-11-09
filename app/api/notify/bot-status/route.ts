import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";

export async function GET() {
  // Verifikasi user login
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!BOT_URL) {
    return NextResponse.json({
      status: "disconnected",
      phone: null,
      qr_available: false,
      supabase: false,
      uptime: "0s",
      error: "Bot URL tidak dikonfigurasi",
    });
  }

  try {
    const res = await fetch(`${BOT_URL}/`, {
      signal: AbortSignal.timeout(5000),
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      return NextResponse.json({ status: "disconnected", phone: null, qr_available: false });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      status: "disconnected",
      phone: null,
      qr_available: false,
      supabase: false,
      uptime: "0s",
    });
  }
}

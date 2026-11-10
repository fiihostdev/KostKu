import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";
const BOT_SECRET = process.env.NOTIFICATION_BOT_SECRET || "";

/**
 * POST /api/notify/bot-start
 * Dipanggil saat admin klik "Hubungkan WA"
 * Memulai proses koneksi WA di bot server dan generate QR
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!BOT_URL || !BOT_SECRET) {
    return NextResponse.json({ error: "Bot tidak dikonfigurasi di server" }, { status: 503 });
  }

  try {
    const res = await fetch(`${BOT_URL}/api/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BOT_SECRET}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 500 });
  } catch {
    return NextResponse.json({ error: "Gagal menghubungi bot service" }, { status: 500 });
  }
}

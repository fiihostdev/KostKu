import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";

// Cache sederhana — bot status tidak mungkin berubah dalam 2 detik
let cachedStatus: Record<string, unknown> | null = null;
let cacheTime = 0;
const CACHE_TTL = 3000;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!BOT_URL) {
      return NextResponse.json({
        status: "idle",
        phone: null,
        qr_available: false,
        has_session: false,
        uptime: "0s",
      });
    }

    // Gunakan cache jika masih fresh
    const now = Date.now();
    if (cachedStatus && now - cacheTime < CACHE_TTL) {
      return NextResponse.json(cachedStatus);
    }

    const res = await fetch(`${BOT_URL}/`, {
      signal: AbortSignal.timeout(5000),
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      return NextResponse.json({
        status: "idle",
        phone: null,
        qr_available: false,
        has_session: false,
        uptime: "0s",
      });
    }

    const data = await res.json();
    cachedStatus = data;
    cacheTime = now;
    return NextResponse.json(data);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[bot-status]", msg);
    return NextResponse.json({
      status: "idle",
      phone: null,
      qr_available: false,
      has_session: false,
      uptime: "0s",
    });
  }
}

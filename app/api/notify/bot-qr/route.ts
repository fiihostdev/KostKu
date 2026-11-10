import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";

/**
 * GET /api/notify/bot-qr
 * Proxy QR image dari Coolify WA bot ke Next.js
 * — Mencegah CORS & menyembunyikan URL bot dari client
 * — Return: image/png jika QR tersedia, 204 jika tidak ada, 503 jika bot offline
 */
export async function GET() {
  // Verifikasi user login
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!BOT_URL) {
    return NextResponse.json({ error: "Bot URL tidak dikonfigurasi" }, { status: 503 });
  }

  try {
    const res = await fetch(`${BOT_URL}/qr-image`, {
      signal: AbortSignal.timeout(8000),
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      return new NextResponse(null, { status: 204 });
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

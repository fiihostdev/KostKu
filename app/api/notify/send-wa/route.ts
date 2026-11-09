import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL;
const BOT_SECRET = process.env.NOTIFICATION_BOT_SECRET;

/**
 * POST /api/notify/send-wa
 * Proxy ke Coolify WA Bot — merahasiakan secret dari client
 *
 * Body: { phone, name, message, invoiceId?, kostId? }
 */
export async function POST(request: NextRequest) {
  // Verifikasi user login (harus punya session Supabase)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!BOT_URL || !BOT_SECRET) {
    // Bot belum dikonfigurasi → return sukses palsu agar UI tidak error
    console.warn("[send-wa] NOTIFICATION_BOT_URL belum dikonfigurasi");
    return NextResponse.json({
      success: true,
      simulated: true,
      message: "Bot belum terkonfigurasi — pesan tidak dikirim",
    });
  }

  try {
    const body = await request.json();

    const response = await fetch(BOT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": BOT_SECRET,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.ok ? 200 : 500 });

  } catch (err) {
    console.error("[send-wa] Error:", err);
    return NextResponse.json(
      { error: "Gagal menghubungi WA bot service" },
      { status: 500 }
    );
  }
}

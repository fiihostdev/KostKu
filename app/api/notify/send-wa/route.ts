import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL;
const BOT_SECRET = process.env.NOTIFICATION_BOT_SECRET;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!BOT_URL || !BOT_SECRET) {
    console.warn("[send-wa] NOTIFICATION_BOT_URL belum dikonfigurasi");
    return NextResponse.json({
      success: false,
      error: "Bot belum dikonfigurasi — hubungi admin platform",
    });
  }

  try {
    const body = await request.json();
    const response = await fetch(BOT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BOT_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.ok ? 200 : 500 });
  } catch (err) {
    console.error("[send-wa] Error:", err);
    return NextResponse.json({ error: "Gagal menghubungi WA bot service" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";
const BOT_SECRET = process.env.NOTIFICATION_BOT_SECRET || "";

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!BOT_URL || !BOT_SECRET) {
    return NextResponse.json({ error: "Bot tidak dikonfigurasi" }, { status: 503 });
  }

  try {
    const res = await fetch(`${BOT_URL}/api/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": BOT_SECRET,
      },
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json({ error: "Gagal menghubungi bot" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL;
const BOT_SECRET = process.env.NOTIFICATION_BOT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!BOT_URL || !BOT_SECRET) {
      return NextResponse.json({ success: false, error: "Bot belum dikonfigurasi" });
    }

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

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-wa]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

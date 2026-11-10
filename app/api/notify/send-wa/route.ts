import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL    = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";
const BOT_SECRET = process.env.NOTIFICATION_BOT_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).single();

    if (!profile) return NextResponse.json({ error: "Profil kost tidak ditemukan" }, { status: 404 });

    const body = await request.json();
    const kostId = profile.id;

    if (!BOT_URL || !BOT_SECRET) {
      return NextResponse.json({ success: false, error: "Bot belum dikonfigurasi" });
    }

    const response = await fetch(`${BOT_URL}/api/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${BOT_SECRET}` },
      body: JSON.stringify({ ...body, kostId }),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.ok ? 200 : 500 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-wa]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

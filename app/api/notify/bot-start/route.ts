import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL    = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";
const BOT_SECRET = process.env.NOTIFICATION_BOT_SECRET || "";

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).single();

    if (!profile) return NextResponse.json({ error: "Profil kost tidak ditemukan" }, { status: 404 });

    const kostId = profile.id;

    if (!BOT_URL || !BOT_SECRET) return NextResponse.json({ success: true, status: "idle", message: "Bot tidak dikonfigurasi" });

    const res = await fetch(`${BOT_URL}/api/start/${kostId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${BOT_SECRET}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Bot error ${res.status}: ${text.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[bot-start]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!BOT_URL) return new NextResponse(null, { status: 204 });

    const res = await fetch(`${BOT_URL}/qr-image`, {
      signal: AbortSignal.timeout(8000),
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) return new NextResponse(null, { status: 204 });

    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

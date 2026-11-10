import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_URL = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!BOT_URL) {
    return new NextResponse(null, { status: 204 });
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
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

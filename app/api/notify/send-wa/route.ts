import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const BOT_URL    = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";
const BOT_SECRET = process.env.NOTIFICATION_BOT_SECRET || "";

export async function POST(request: NextRequest) {
  const rl = enforceRateLimit(request, "send-wa", RATE_LIMITS.MUTATION);
  if (rl) return rl;
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Profil kost tidak ditemukan" }, { status: 404 });

    const kostId = profile.id;
    const body   = await request.json();

    // H3 FIX: Whitelist only allowed fields — do NOT forward entire client body
    const { phone, name, message, invoiceId } = body;

    // Validate required fields
    if (!phone || !message) {
      return NextResponse.json({ error: "phone dan message wajib diisi" }, { status: 400 });
    }

    // Sanitize phone — only digits, +, -, spaces
    const safePhone = String(phone).replace(/[^0-9+\-\s]/g, "").slice(0, 20);
    if (!safePhone || safePhone.replace(/[^0-9]/g, "").length < 7) {
      return NextResponse.json({ error: "Format nomor telepon tidak valid" }, { status: 400 });
    }

    // Sanitize message — cap length, remove null bytes
    const safeMessage = String(message).replace(/\x00/g, "").slice(0, 2000);
    const safeName    = name ? String(name).trim().slice(0, 100) : "";

    // Validate invoiceId belongs to this kost (if provided)
    if (invoiceId) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("id, kost_id")
        .eq("id", invoiceId)
        .eq("kost_id", kostId)
        .maybeSingle();
      if (!inv) {
        return NextResponse.json({ error: "Invoice tidak valid" }, { status: 403 });
      }
    }

    if (!BOT_URL || !BOT_SECRET) {
      return NextResponse.json({ success: false, error: "Bot belum dikonfigurasi" });
    }

    const response = await fetch(`${BOT_URL}/api/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${BOT_SECRET}` },
      // Only send whitelisted, sanitized fields
      body: JSON.stringify({ phone: safePhone, name: safeName, message: safeMessage, invoiceId: invoiceId || null, kostId }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.ok ? 200 : 500 });

  } catch (err: unknown) {
    console.error("[send-wa]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

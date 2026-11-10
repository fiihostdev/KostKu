import { NextResponse } from "next/server";

/**
 * GET /api/debug
 * Temporary diagnostic endpoint — HAPUS setelah masalah terselesaikan
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Cek env vars
  results.env = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    BOT_URL: process.env.NOTIFICATION_BOT_URL || "MISSING",
    BOT_SECRET: !!process.env.NOTIFICATION_BOT_SECRET,
  };

  // 2. Test createClient
  try {
    const { createClient } = await import("@/lib/supabase-server");
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    results.supabase = { ok: !error, userId: data?.user?.id || null, error: error?.message || null };
  } catch (e: unknown) {
    results.supabase = { ok: false, error: String(e) };
  }

  // 3. Test bot connectivity
  const botUrl = process.env.NOTIFICATION_BOT_URL?.replace("/api/send-notification", "") || "";
  if (botUrl) {
    try {
      const res = await fetch(`${botUrl}/health`, { signal: AbortSignal.timeout(5000) });
      const text = await res.text();
      results.bot = { status: res.status, ok: res.ok, body: text.slice(0, 200) };
    } catch (e: unknown) {
      results.bot = { ok: false, error: String(e) };
    }
  } else {
    results.bot = { ok: false, error: "BOT_URL not configured" };
  }

  return NextResponse.json(results);
}

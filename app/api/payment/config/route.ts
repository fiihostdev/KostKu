import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET  /api/payment/config — ambil semua config payment kost ini
 * POST /api/payment/config — simpan/update config satu provider
 */

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Profil kost tidak ditemukan" }, { status: 404 });

    const { data: configs } = await supabase
      .from("payment_configs")
      .select("provider, is_active, is_production, config, updated_at")
      .eq("kost_id", profile.id);

    // Mask sensitive keys
    const masked = (configs || []).map((c) => {
      const cfg = { ...(c.config as Record<string, string>) };
      // Midtrans
      if (cfg.server_key)    cfg.server_key    = maskKey(cfg.server_key);
      if (cfg.client_key)    cfg.client_key    = maskKey(cfg.client_key);
      // Tripay
      if (cfg.api_key)       cfg.api_key       = maskKey(cfg.api_key);
      if (cfg.private_key)   cfg.private_key   = maskKey(cfg.private_key);
      // Xendit
      if (cfg.secret_key)    cfg.secret_key    = maskKey(cfg.secret_key);
      if (cfg.webhook_token) cfg.webhook_token = maskKey(cfg.webhook_token);
      return { ...c, config: cfg };
    });

    return NextResponse.json({ configs: masked });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rl = enforceRateLimit(request, "payment-config", RATE_LIMITS.MUTATION);
  if (rl) return rl;
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Profil kost tidak ditemukan" }, { status: 404 });

    const body = await request.json();
    const { provider, is_active, is_production, config: newConfig } = body;

    if (!["midtrans", "tripay", "xendit"].includes(provider)) {
      return NextResponse.json({ error: "Provider tidak valid" }, { status: 400 });
    }

    // Jika ada placeholder "***" di config, ambil nilai lama
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await supabaseService
      .from("payment_configs")
      .select("config")
      .eq("kost_id", profile.id)
      .eq("provider", provider)
      .single();

    const existingConfig = (existing?.config as Record<string, string>) || {};
    const mergedConfig: Record<string, string> = { ...existingConfig };

    // Hanya update value yang tidak placeholder (***) — restore nilai lama untuk semua sensitive keys
    const SENSITIVE_KEYS = new Set([
      "server_key", "client_key",    // Midtrans
      "api_key", "private_key",      // Tripay
      "secret_key", "webhook_token", // Xendit
    ]);

    for (const [key, val] of Object.entries(newConfig as Record<string, string>)) {
      if (val && !val.includes("***")) {
        mergedConfig[key] = val;
      } else if (val.includes("***") && SENSITIVE_KEYS.has(key) && existingConfig[key]) {
        // Placeholder untuk sensitive key → pakai nilai lama
        mergedConfig[key] = existingConfig[key];
      }
    }

    const { error } = await supabaseService
      .from("payment_configs")
      .upsert({
        kost_id:       profile.id,
        provider,
        is_active:     Boolean(is_active),
        is_production: Boolean(is_production),
        config:        mergedConfig,
        updated_at:    new Date().toISOString(),
      }, { onConflict: "kost_id,provider" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, provider });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return "***";
  return key.slice(0, 6) + "***" + key.slice(-4);
}

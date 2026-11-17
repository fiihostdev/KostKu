import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Platform-level payment configuration (Superadmin only)
 * GET  /api/superadmin/platform-payment  → ambil config
 * POST /api/superadmin/platform-payment  → simpan/update config
 *
 * Digunakan untuk pembayaran: paket baru, upgrade paket, biaya ganti subdomain.
 * Mendukung: Midtrans, Tripay, Xendit, QRIS Statis, Transfer Bank.
 */

const SERVICE = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Semua config keys yang dikelola */
const ALL_KEYS = [
  // ── Midtrans ─────────────────────────────────────────────────────────────
  "midtrans_client_key",
  "midtrans_server_key",
  "midtrans_merchant_id",
  "midtrans_is_production",
  "midtrans_enabled",
  // ── Tripay ────────────────────────────────────────────────────────────────
  "tripay_merchant_code",
  "tripay_api_key",
  "tripay_private_key",
  "tripay_channel",
  "tripay_is_production",
  "tripay_enabled",
  // ── Xendit ───────────────────────────────────────────────────────────────
  "xendit_secret_key",
  "xendit_webhook_token",
  "xendit_is_production",
  "xendit_enabled",
  // ── QRIS Statis ───────────────────────────────────────────────────────────
  "qris_image_url",
  "qris_enabled",
  "qris_account_name",
  "qris_bank_name",
  "qris_no_rekening",
  // ── Transfer Bank ─────────────────────────────────────────────────────────
  "transfer_enabled",
  "transfer_bank_name",
  "transfer_account_name",
  "transfer_no_rekening",
  "transfer_instructions",
] as const;

/** Keys yang perlu di-mask saat GET */
const SENSITIVE_KEYS_ARRAY = [
  "midtrans_server_key",
  "tripay_api_key",
  "tripay_private_key",
  "xendit_secret_key",
  "xendit_webhook_token",
] as const;
const SENSITIVE_KEYS = new Set<string>(SENSITIVE_KEYS_ARRAY);

function maskKey(key: string): string {
  if (!key || key.length < 8) return "***";
  return key.slice(0, 6) + "***" + key.slice(-4);
}

/** Guard: hanya superadmin */
async function guardSuperadmin(): Promise<{ ok: boolean; error?: NextResponse }> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("kost_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.role !== "superadmin") {
    return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}

export async function GET() {
  const guard = await guardSuperadmin();
  if (!guard.ok) return guard.error!;

  try {
    const { data, error } = await SERVICE
      .from("platform_config")
      .select("key, value")
      .in("key", Array.from(ALL_KEYS) as string[]);

    if (error) return NextResponse.json({ config: {} });

    const config: Record<string, string> = {};
    for (const row of (data || [])) {
      config[row.key] = SENSITIVE_KEYS.has(row.key) ? maskKey(row.value) : row.value;
    }

    return NextResponse.json({ config });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rl = enforceRateLimit(request, "platform-payment", RATE_LIMITS.MUTATION);
  if (rl) return rl;

  const guard = await guardSuperadmin();
  if (!guard.ok) return guard.error!;

  try {
    const body: Record<string, string | boolean> = await request.json();

    // Ambil nilai lama untuk keys sensitive (agar placeholder tidak overwrite)
    const { data: existing } = await SERVICE
      .from("platform_config")
      .select("key, value")
      .in("key", SENSITIVE_KEYS_ARRAY as unknown as string[]);

    const existingMap: Record<string, string> = {};
    for (const row of (existing || [])) {
      existingMap[row.key] = row.value;
    }

    // Build upsert rows
    const allKeysSet = new Set<string>(ALL_KEYS);
    const rows = Object.entries(body)
      .filter(([key]) => allKeysSet.has(key))
      .map(([key, value]) => {
        const strVal = String(value);
        // Jika placeholder untuk sensitive key → pakai nilai lama
        if (strVal.includes("***") && SENSITIVE_KEYS.has(key) && existingMap[key]) {
          return { key, value: existingMap[key] };
        }
        return { key, value: strVal };
      });

    if (rows.length === 0) {
      return NextResponse.json({ success: true, saved: 0 });
    }

    const { error } = await SERVICE
      .from("platform_config")
      .upsert(rows, { onConflict: "key" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, saved: rows.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

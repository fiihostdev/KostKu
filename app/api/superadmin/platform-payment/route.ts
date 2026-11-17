import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Platform-level payment configuration (Superadmin only)
 * GET  /api/superadmin/platform-payment       → ambil config platform
 * POST /api/superadmin/platform-payment       → simpan/update config
 *
 * Config ini digunakan untuk:
 * - Menerima pembayaran pembelian paket baru
 * - Menerima pembayaran upgrade/downgrade paket
 * - Menerima biaya ganti subdomain
 * - Onboarding step-4 pembayaran paket
 */

const SERVICE = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Pastikan user adalah superadmin */
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

function maskKey(key: string): string {
  if (!key || key.length < 8) return "***";
  return key.slice(0, 6) + "***" + key.slice(-4);
}

export async function GET() {
  const guard = await guardSuperadmin();
  if (!guard.ok) return guard.error!;

  try {
    // Ambil dari platform_config table (key-value store)
    const { data, error } = await SERVICE
      .from("platform_config")
      .select("key, value")
      .in("key", [
        "midtrans_client_key",
        "midtrans_server_key",
        "midtrans_is_production",
        "midtrans_enabled",
        "qris_image_url",
        "qris_enabled",
        "qris_account_name",
        "qris_bank_name",
        "qris_no_rekening",
        "transfer_enabled",
        "transfer_bank_name",
        "transfer_account_name",
        "transfer_no_rekening",
        "transfer_instructions",
      ]);

    if (error) {
      // Tabel mungkin belum ada — kembalikan empty config
      return NextResponse.json({ config: {} });
    }

    // Build config object
    const config: Record<string, string> = {};
    for (const row of (data || [])) {
      config[row.key] = row.value;
    }

    // Mask sensitive keys
    if (config.midtrans_server_key) {
      config.midtrans_server_key = maskKey(config.midtrans_server_key);
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

    // Ambil nilai lama untuk keys yang sensitive (agar placeholder tidak overwrite)
    const { data: existing } = await SERVICE
      .from("platform_config")
      .select("key, value")
      .in("key", ["midtrans_server_key"]);

    const existingMap: Record<string, string> = {};
    for (const row of (existing || [])) {
      existingMap[row.key] = row.value;
    }

    // Build upsert rows
    const rows = Object.entries(body)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([key, value]) => {
        const strVal = String(value);
        // Jika placeholder, gunakan nilai lama
        if (strVal.includes("***") && existingMap[key]) {
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

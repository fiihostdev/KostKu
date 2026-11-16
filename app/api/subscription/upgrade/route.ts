import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPlanLimits } from "@/lib/plan-limits";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const PLAN_PRICES: Record<string, number> = {
  starter:    99_000,
  pro:        199_000,
  enterprise: 399_000,
};

const PLAN_ORDER: Record<string, number> = {
  starter: 0,
  pro: 1,
  enterprise: 2,
};

/**
 * POST /api/subscription/upgrade
 * Upgrade atau downgrade paket admin kost.
 *
 * Body: { targetPlan: "starter" | "pro" | "enterprise", confirmedDowngrade?: boolean }
 *
 * Aturan:
 * - Upgrade → langsung aktif, akan ditagih di renewal berikutnya
 * - Downgrade ke Starter → hanya bisa jika kamar <= 15
 * - Downgrade ke Pro → hanya bisa jika kamar <= 50
 * - Masa aktif: diperpanjang 30 hari dari sekarang
 */
export async function POST(request: NextRequest) {
  const rl = enforceRateLimit(request, "subscription-change", RATE_LIMITS.AUTH);
  if (rl) return rl;

  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("id, paket, max_kamar, is_suspended, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
    if (profile.is_suspended) return NextResponse.json({ error: "Akun disuspend" }, { status: 403 });

    const body = await request.json();
    const rawTarget = String(body.targetPlan || "").toLowerCase().trim().replace("paket ", "");
    const confirmedDowngrade = Boolean(body.confirmedDowngrade);

    if (!["starter", "pro", "enterprise"].includes(rawTarget)) {
      return NextResponse.json({ error: "Paket tidak valid" }, { status: 400 });
    }

    const currentPlan = (profile.paket || "starter").toLowerCase().replace("paket ", "");
    const targetPlan  = rawTarget;

    if (currentPlan === targetPlan) {
      return NextResponse.json({ error: "Paket sudah aktif" }, { status: 400 });
    }

    const currentOrder = PLAN_ORDER[currentPlan] ?? 0;
    const targetOrder  = PLAN_ORDER[targetPlan] ?? 0;
    const isDowngrade  = targetOrder < currentOrder;

    // ── Downgrade validation ─────────────────────────────────────────────────
    if (isDowngrade && !confirmedDowngrade) {
      return NextResponse.json({
        requiresConfirmation: true,
        message: `Downgrade ke ${targetPlan} memerlukan konfirmasi.`,
      }, { status: 428 }); // 428 Precondition Required
    }

    if (isDowngrade) {
      // Check if current rooms exceed target plan limit
      const targetLimits = getPlanLimits(targetPlan);
      const { count: roomCount } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("kost_id", profile.id);

      const currentRoomCount = roomCount || 0;
      if (currentRoomCount > targetLimits.maxKamar) {
        return NextResponse.json({
          error: `Tidak bisa downgrade ke ${targetPlan}. Anda memiliki ${currentRoomCount} kamar, sedangkan batas ${targetPlan} adalah ${targetLimits.maxKamar} kamar. Hapus ${currentRoomCount - targetLimits.maxKamar} kamar terlebih dahulu.`,
          blockingReason: "room_limit_exceeded",
          currentRooms: currentRoomCount,
          targetLimit: targetLimits.maxKamar,
        }, { status: 403 });
      }

      // Check branches for downgrade to starter (no multi-branch)
      if (targetPlan === "starter") {
        const { count: branchCount } = await supabase
          .from("kost_branches")
          .select("*", { count: "exact", head: true })
          .eq("kost_id", profile.id)
          .eq("is_active", true);

        if ((branchCount || 0) > 0) {
          return NextResponse.json({
            error: `Tidak bisa downgrade ke Starter karena masih memiliki ${branchCount} cabang aktif. Nonaktifkan semua cabang terlebih dahulu.`,
            blockingReason: "active_branches",
            activeBranches: branchCount,
          }, { status: 403 });
        }
      }
    }

    // ── Apply plan change ─────────────────────────────────────────────────────
    // Perpanjang masa aktif 30 hari dari sekarang
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);

    const { error: updateError } = await supabase
      .from("kost_profiles")
      .update({
        paket: targetPlan,
        expires_at: newExpiresAt.toISOString(),
      })
      .eq("id", profile.id);

    if (updateError) {
      return NextResponse.json({ error: "Gagal mengubah paket" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      plan: targetPlan,
      type: isDowngrade ? "downgrade" : "upgrade",
      price: PLAN_PRICES[targetPlan],
      expiresAt: newExpiresAt.toISOString(),
      message: isDowngrade
        ? `Paket berhasil di-downgrade ke ${targetPlan}.`
        : `Paket berhasil di-upgrade ke ${targetPlan}!`,
    });

  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/subscription/upgrade
 * Ambil info paket saat ini + pilihan upgrade/downgrade + harga
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("id, paket, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });

    const currentPlan = (profile.paket || "starter").toLowerCase().replace("paket ", "");

    // Count rooms for downgrade eligibility check
    const { count: roomCount } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("kost_id", profile.id);

    const { count: branchCount } = await supabase
      .from("kost_branches")
      .select("*", { count: "exact", head: true })
      .eq("kost_id", profile.id)
      .eq("is_active", true);

    const plans = [
      {
        id: "starter",
        name: "Paket Starter",
        price: 99_000,
        priceLabel: "Rp 99.000/bln",
        maxKamar: 15,
        maxCabang: 1,
        features: ["Hingga 15 Kamar", "1 Lokasi Kost", "Website Subdomain Gratis", "Manajemen Kamar & Penyewa"],
        canDowngradeTo: currentPlan !== "starter" && (roomCount || 0) <= 15 && (branchCount || 0) === 0,
        downgradeBlocked: currentPlan !== "starter" && ((roomCount || 0) > 15 || (branchCount || 0) > 0),
      },
      {
        id: "pro",
        name: "Paket Pro",
        price: 199_000,
        priceLabel: "Rp 199.000/bln",
        maxKamar: 50,
        maxCabang: 3,
        features: ["Hingga 50 Kamar", "3 Cabang Kost", "WhatsApp Tagihan Otomatis", "Payment Gateway (QRIS/VA)", "Laporan Ekspor CSV"],
        canDowngradeTo: currentPlan === "enterprise" && (roomCount || 0) <= 50,
        downgradeBlocked: currentPlan === "enterprise" && (roomCount || 0) > 50,
      },
      {
        id: "enterprise",
        name: "Paket Enterprise",
        price: 399_000,
        priceLabel: "Rp 399.000/bln",
        maxKamar: 999999,
        maxCabang: 99,
        features: ["Kamar & Properti Tanpa Batas", "Multi-User Admin", "Domain Kustom (.com/.id)", "Master Dashboard Multi-Kost"],
        canDowngradeTo: false,
        downgradeBlocked: false,
      },
    ];

    return NextResponse.json({
      currentPlan,
      expiresAt: profile.expires_at,
      currentRooms: roomCount || 0,
      activeBranches: branchCount || 0,
      plans,
    });

  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

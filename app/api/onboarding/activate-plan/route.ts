import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPlanLimits } from "@/lib/plan-limits";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const ALLOWED_PLANS = ["starter", "pro", "enterprise"] as const;
type AllowedPlan = typeof ALLOWED_PLANS[number];

export async function POST(request: NextRequest) {
  const rl = enforceRateLimit(request, "activate-plan", RATE_LIMITS.AUTH);
  if (rl) return rl;
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const rawPlan = String(body.plan || "").toLowerCase().trim().replace("paket ", "");

    if (!ALLOWED_PLANS.includes(rawPlan as AllowedPlan)) {
      return NextResponse.json({ error: "Plan tidak valid" }, { status: 400 });
    }

    const plan = rawPlan as AllowedPlan;

    // Hanya boleh upgrade, tidak boleh downgrade via endpoint ini
    // Downgrade dilakukan oleh superadmin saja
    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("id, paket")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });

    // Check if it's actually an upgrade or same plan
    const currentLimits = getPlanLimits(profile.paket || "starter");
    const newLimits     = getPlanLimits(plan);

    if (newLimits.maxKamar < currentLimits.maxKamar) {
      // Trying to downgrade — block
      return NextResponse.json({
        error: "Downgrade tidak diizinkan. Hubungi superadmin.",
      }, { status: 403 });
    }

    const { error } = await supabase
      .from("kost_profiles")
      .update({ paket: plan })
      .eq("id", profile.id);

    if (error) {
      console.error("[activate-plan]", error.message);
      return NextResponse.json({ error: "Gagal mengaktifkan paket" }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

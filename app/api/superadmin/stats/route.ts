import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPlanLimits } from "@/lib/plan-limits";

const PLAN_PRICES: Record<string, number> = {
  starter:    99000,
  pro:        199000,
  enterprise: 399000,
};

/**
 * GET /api/superadmin/stats
 * Platform revenue, MRR, tenant analytics for superadmin dashboard
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("role").eq("user_id", user.id).maybeSingle();
    if (!profile || profile.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. All active (non-suspended) tenant profiles
    const { data: tenants } = await supabase
      .from("kost_profiles")
      .select("id, nama, paket, is_suspended, created_at, expires_at")
      .neq("role", "superadmin");

    const allTenants    = tenants || [];
    const activeTenants = allTenants.filter((t) => !t.is_suspended);
    const suspended     = allTenants.filter((t) => t.is_suspended);

    // 2. MRR = sum of active tenant subscription prices
    const mrr = activeTenants.reduce((sum, t) => {
      const paket = (t.paket || "starter").toLowerCase().replace("paket ", "");
      return sum + (PLAN_PRICES[paket] || 0);
    }, 0);

    // 3. Plan distribution
    const planDistribution = {
      starter:    activeTenants.filter((t) => (t.paket || "").toLowerCase().replace("paket ", "") === "starter").length,
      pro:        activeTenants.filter((t) => (t.paket || "").toLowerCase().replace("paket ", "") === "pro").length,
      enterprise: activeTenants.filter((t) => (t.paket || "").toLowerCase().replace("paket ", "") === "enterprise").length,
    };

    // 4. Expiring soon (within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = allTenants.filter((t) => {
      if (!t.expires_at) return false;
      const exp = new Date(t.expires_at);
      return exp > now && exp <= thirtyDaysFromNow;
    }).length;

    // 5. New this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = allTenants.filter((t) => new Date(t.created_at) >= startOfMonth).length;

    // 6. Total rooms across platform
    const { count: totalRooms } = await supabase
      .from("rooms").select("*", { count: "exact", head: true });

    // 7. Total tenants (penyewa) across platform
    const { count: totalPenyewa } = await supabase
      .from("tenants").select("*", { count: "exact", head: true });

    // 8. Platform invoices revenue (what admins have collected — this month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: monthInvoices } = await supabase
      .from("invoices")
      .select("nominal")
      .eq("status", "Lunas")
      .gte("created_at", monthStart);

    const platformCollectedThisMonth = (monthInvoices || [])
      .reduce((s, i) => s + Number(i.nominal), 0);

    return NextResponse.json({
      mrr,
      arr: mrr * 12,
      activeTenants: activeTenants.length,
      suspendedTenants: suspended.length,
      totalTenants: allTenants.length,
      planDistribution,
      expiringSoon,
      newThisMonth,
      totalRooms: totalRooms || 0,
      totalPenyewa: totalPenyewa || 0,
      platformCollectedThisMonth,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

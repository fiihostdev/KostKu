import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * POST /api/superadmin/activity-log — persist a log entry to DB
 * GET  /api/superadmin/activity-log — read recent logs (last 100)
 */

async function verifySuperadmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("kost_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (!profile || profile.role !== "superadmin") return null;
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await verifySuperadmin(supabase);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { action, target, detail, metadata } = body;

    if (!action || !target) {
      return NextResponse.json({ error: "action dan target wajib diisi" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        actor:    "superadmin",
        action:   String(action).trim().slice(0, 50),
        target:   String(target).trim().slice(0, 200),
        detail:   detail ? String(detail).trim().slice(0, 500) : null,
        metadata: metadata || {},
      })
      .select("id, created_at")
      .single();

    if (error) return NextResponse.json({ error: "Gagal menyimpan log" }, { status: 500 });
    return NextResponse.json({ success: true, id: data.id });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createClient();
    const user = await verifySuperadmin(supabase);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: "Gagal memuat log" }, { status: 500 });
    return NextResponse.json({ logs: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

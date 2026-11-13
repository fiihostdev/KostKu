import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPlanLimits, canAddRoom } from "@/lib/plan-limits";

/**
 * GET /api/plan/check
 * Cek limit paket admin yang sedang login
 * Returns: limits, usage, can_add_room, dll
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ambil profil + hitung penggunaan sekarang
    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("id, paket, max_kamar, is_suspended, expires_at")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });

    // Cek apakah akun suspended
    if (profile.is_suspended) {
      return NextResponse.json({
        suspended: true,
        error: "Akun Anda sedang disuspend. Hubungi admin platform.",
      }, { status: 403 });
    }

    // Cek apakah paket kadaluarsa
    if (profile.expires_at && new Date(profile.expires_at) < new Date()) {
      return NextResponse.json({
        expired: true,
        error: "Paket langganan Anda telah kadaluarsa. Perpanjang untuk melanjutkan.",
        expires_at: profile.expires_at,
      }, { status: 402 });
    }

    // Hitung penggunaan saat ini
    const { count: roomCount } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("kost_id", profile.id);

    const paket = profile.paket || "Starter";
    // Gunakan max_kamar dari DB jika diset superadmin, otherwise dari plan limits
    const limits = getPlanLimits(paket);
    const effectiveMaxKamar = profile.max_kamar || limits.maxKamar;
    const currentRoomCount = roomCount || 0;

    return NextResponse.json({
      paket,
      limits: {
        ...limits,
        maxKamar: effectiveMaxKamar, // override dari superadmin
      },
      usage: {
        rooms: currentRoomCount,
      },
      canAddRoom: currentRoomCount < effectiveMaxKamar,
      roomsRemaining: Math.max(0, effectiveMaxKamar - currentRoomCount),
      suspended: false,
      expired: false,
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

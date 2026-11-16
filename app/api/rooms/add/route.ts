import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPlanLimits } from "@/lib/plan-limits";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const VALID_TIPE   = ["Standard", "Deluxe", "VIP"] as const;
const VALID_STATUS = ["Terisi", "Kosong", "Perawatan"] as const;

export async function POST(request: NextRequest) {
  const rl = enforceRateLimit(request, "rooms-add", RATE_LIMITS.MUTATION);
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
    if (profile.is_suspended) return NextResponse.json({ error: "Akun Anda sedang disuspend." }, { status: 403 });
    if (profile.expires_at && new Date(profile.expires_at) < new Date()) {
      return NextResponse.json({ error: "Paket kadaluarsa. Perpanjang untuk melanjutkan." }, { status: 402 });
    }

    // Hitung total kamar (semua branch) untuk enforce plan limit
    const { count: currentCount } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("kost_id", profile.id);

    const roomCount  = currentCount || 0;
    const limits     = getPlanLimits(profile.paket || "starter");
    // max_kamar hanya override ke ATAS batas paket (bukan ke bawah)
    const dbMaxKamar = profile.max_kamar && profile.max_kamar > 0 ? profile.max_kamar : null;
    const effectiveMax = dbMaxKamar && dbMaxKamar >= limits.maxKamar
      ? dbMaxKamar
      : limits.maxKamar;

    if (roomCount >= effectiveMax) {
      return NextResponse.json({
        error: `Batas kamar tercapai. Paket ${profile.paket} maksimal ${effectiveMax} kamar. Upgrade paket untuk menambah lebih banyak.`,
        limitReached: true,
        currentCount:  roomCount,
        maxAllowed:    effectiveMax,
        paket:         profile.paket,
      }, { status: 403 });
    }

    const body = await request.json();
    const { nomor, lantai, tipe, harga, status, penyewa, fasilitas, deskripsi, luasM2, branch_id } = body;

    if (!nomor || !tipe || !harga) {
      return NextResponse.json({ error: "nomor, tipe, dan harga wajib diisi" }, { status: 400 });
    }
    if (!VALID_TIPE.includes(tipe)) {
      return NextResponse.json({ error: "Tipe kamar tidak valid" }, { status: 400 });
    }
    if (status && !VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: "Status kamar tidak valid" }, { status: 400 });
    }
    if (Number(harga) <= 0 || Number(harga) > 100_000_000) {
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
    }

    // ── C2 FIX: Validate branch_id belongs to this kost ───────────────────────
    if (branch_id) {
      const { data: branchCheck } = await supabase
        .from("kost_branches")
        .select("id")
        .eq("id", branch_id)
        .eq("kost_id", profile.id)
        .maybeSingle();
      if (!branchCheck) {
        return NextResponse.json({ error: "Cabang tidak valid" }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        kost_id:    profile.id,
        branch_id:  branch_id || null,
        nomor:      String(nomor).trim().slice(0, 20),
        lantai:     Number(lantai) || 1,
        tipe,
        harga:      Number(harga),
        status:     status || "Kosong",
        penyewa:    penyewa || null,
        fasilitas:  fasilitas || [],
        deskripsi:  deskripsi || null,
        luas_m2:    luasM2 ? Number(luasM2) : null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Gagal menyimpan kamar" }, { status: 500 });

    return NextResponse.json({
      success: true,
      room: data,
      usage: { rooms: roomCount + 1, maxRooms: effectiveMax },
    }, { status: 201 });

  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

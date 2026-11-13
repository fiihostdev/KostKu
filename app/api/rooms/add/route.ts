import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { canAddRoom } from "@/lib/plan-limits";

/**
 * POST /api/rooms/add
 * Server-side validation sebelum tambah kamar:
 * 1. Cek auth
 * 2. Cek suspended
 * 3. Cek limit paket
 * 4. Insert kamar
 *
 * Ini adalah enforcement server-side yang tidak bisa di-bypass dari browser
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ambil profil + cek status
    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("id, paket, max_kamar, is_suspended, expires_at")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
    if (profile.is_suspended) return NextResponse.json({ error: "Akun Anda sedang disuspend." }, { status: 403 });
    if (profile.expires_at && new Date(profile.expires_at) < new Date()) {
      return NextResponse.json({ error: "Paket kadaluarsa. Perpanjang untuk melanjutkan." }, { status: 402 });
    }

    // Hitung kamar yang sudah ada
    const { count: currentCount } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("kost_id", profile.id);

    const roomCount = currentCount || 0;
    // Pakai max_kamar dari superadmin jika ada, otherwise dari plan limits
    const { getPlanLimits } = await import("@/lib/plan-limits");
    const limits = getPlanLimits(profile.paket || "starter");
    const effectiveMax = profile.max_kamar || limits.maxKamar;

    // ── ENFORCE LIMIT ──────────────────────────────────────────────────────────
    if (roomCount >= effectiveMax) {
      return NextResponse.json({
        error: `Batas kamar tercapai. Paket ${profile.paket} maksimal ${effectiveMax} kamar. Upgrade paket untuk menambah lebih banyak.`,
        limitReached: true,
        currentCount:  roomCount,
        maxAllowed:    effectiveMax,
        paket:         profile.paket,
      }, { status: 403 });
    }

    // Parse body dan insert kamar
    const body = await request.json();
    const { nomor, lantai, tipe, harga, status, penyewa, fasilitas, deskripsi, luasM2 } = body;

    if (!nomor || !tipe || !harga) {
      return NextResponse.json({ error: "nomor, tipe, dan harga wajib diisi" }, { status: 400 });
    }

    // Validasi tipe kamar
    if (!["Standard", "Deluxe", "VIP"].includes(tipe)) {
      return NextResponse.json({ error: "Tipe kamar tidak valid" }, { status: 400 });
    }

    // Validasi harga positif
    if (Number(harga) <= 0 || Number(harga) > 100000000) {
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        kost_id:    profile.id,
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      room: data,
      usage: { rooms: roomCount + 1, maxRooms: effectiveMax },
    }, { status: 201 });

  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

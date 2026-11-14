import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPlanLimits } from "@/lib/plan-limits";

/**
 * GET /api/branches  — ambil semua cabang + statistik per cabang
 * POST /api/branches — tambah cabang baru (cek limit paket server-side)
 */

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("id, paket, is_suspended")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
    if (profile.is_suspended) return NextResponse.json({ error: "Akun disuspend" }, { status: 403 });

    const { data: branches, error } = await supabase
      .from("kost_branches")
      .select("*")
      .eq("kost_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ── Enrich tiap cabang dengan statistik rooms & tenants ──────────────────
    // Catatan: cabang berbagi kost_id yang sama dengan profil utama.
    // Statistik rooms menggunakan field cabang_id (branch_id) jika ada,
    // atau filter berdasarkan nomor kamar prefix cabang.
    // Untuk versi ini kita hitung total kamar/penyewa dari kost_id (shared pool)
    // dan tandai di response bahwa ini adalah shared pool.
    // Per-cabang stats dapat diimplementasi nanti dengan kolom branch_id pada rooms.
    const enriched = await Promise.all((branches || []).map(async (b) => {
      // Hitung rooms yang merujuk ke cabang ini (future: by branch_id column)
      // Untuk saat ini return 0 karena rooms belum punya kolom branch_id
      return {
        ...b,
        stats: {
          totalKamar:  0,
          kamarTerisi: 0,
          totalPenyewa: 0,
          okupansi: 0,
        },
      };
    }));

    const limits = getPlanLimits(profile.paket || "starter");
    const activeBranches = (branches || []).filter((b) => b.is_active).length;

    return NextResponse.json({
      branches: enriched,
      limits: {
        maxCabang: limits.maxCabang,
        hasMultiCabang: limits.maxCabang > 1,
      },
      usage: {
        cabang: (branches || []).length,
        cabangAktif: activeBranches,
      },
      canAddBranch: (branches || []).length < limits.maxCabang,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("id, paket, is_suspended, expires_at")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
    if (profile.is_suspended) return NextResponse.json({ error: "Akun Anda disuspend" }, { status: 403 });
    if (profile.expires_at && new Date(profile.expires_at) < new Date()) {
      return NextResponse.json({ error: "Paket kadaluarsa. Perpanjang untuk melanjutkan." }, { status: 402 });
    }

    const limits = getPlanLimits(profile.paket || "starter");

    if (limits.maxCabang <= 1) {
      return NextResponse.json({
        error: `Paket ${profile.paket} tidak mendukung multi-cabang. Upgrade ke Paket Pro atau Enterprise.`,
        limitReached: true,
      }, { status: 403 });
    }

    const { count: branchCount } = await supabase
      .from("kost_branches")
      .select("*", { count: "exact", head: true })
      .eq("kost_id", profile.id);

    const currentCount = branchCount || 0;

    if (currentCount >= limits.maxCabang) {
      return NextResponse.json({
        error: `Paket ${profile.paket} hanya mendukung maksimal ${limits.maxCabang} cabang. Upgrade ke Enterprise untuk cabang tak terbatas.`,
        limitReached: true,
        currentCount,
        maxAllowed: limits.maxCabang,
      }, { status: 403 });
    }

    const body = await request.json();
    const { nama, subdomain, alamat, telepon, tagline } = body;

    if (!nama?.trim() || !subdomain?.trim()) {
      return NextResponse.json({ error: "Nama dan subdomain wajib diisi" }, { status: 400 });
    }

    const cleanSub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (cleanSub.length < 3) {
      return NextResponse.json({ error: "Subdomain minimal 3 karakter" }, { status: 400 });
    }

    // Reserved list
    const reserved = ["www","api","admin","superadmin","app","mail","ftp","cdn","static","media"];
    if (reserved.includes(cleanSub)) {
      return NextResponse.json({ error: "Subdomain ini tidak diizinkan" }, { status: 400 });
    }

    // Conflict check — kost_profiles
    const { data: existingProfile } = await supabase
      .from("kost_profiles").select("id").eq("subdomain", cleanSub).maybeSingle();
    if (existingProfile) {
      return NextResponse.json({ error: "Subdomain sudah digunakan oleh kost lain" }, { status: 409 });
    }

    // Conflict check — kost_branches
    const { data: existingBranch } = await supabase
      .from("kost_branches").select("id").eq("subdomain", cleanSub).maybeSingle();
    if (existingBranch) {
      return NextResponse.json({ error: "Subdomain sudah digunakan oleh cabang lain" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("kost_branches")
      .insert({
        kost_id:   profile.id,
        nama:      nama.trim().slice(0, 100),
        subdomain: cleanSub,
        alamat:    alamat?.trim() || null,
        telepon:   telepon?.trim() || null,
        tagline:   tagline?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, branch: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

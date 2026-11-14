import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPlanLimits } from "@/lib/plan-limits";

/**
 * GET /api/branches  — ambil semua cabang milik admin login
 * POST /api/branches — tambah cabang baru (cek limit paket)
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

    const limits = getPlanLimits(profile.paket || "starter");

    return NextResponse.json({
      branches: branches || [],
      limits: {
        maxCabang: limits.maxCabang,
        hasMultiCabang: limits.maxCabang > 1,
      },
      usage: { cabang: (branches || []).length },
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
      return NextResponse.json({ error: "Paket kadaluarsa" }, { status: 402 });
    }

    const limits = getPlanLimits(profile.paket || "starter");

    // Paket Starter (maxCabang = 1) tidak boleh tambah cabang
    if (limits.maxCabang <= 1) {
      return NextResponse.json({
        error: `Paket ${profile.paket} tidak mendukung multi-cabang. Upgrade ke Paket Pro atau Enterprise.`,
        limitReached: true,
      }, { status: 403 });
    }

    // Hitung cabang yang sudah ada
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
      return NextResponse.json({ error: "nama dan subdomain wajib diisi" }, { status: 400 });
    }

    // Validasi subdomain format
    const cleanSub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (cleanSub.length < 3) {
      return NextResponse.json({ error: "Subdomain minimal 3 karakter" }, { status: 400 });
    }

    // Cek subdomain tidak bentrok dengan kost_profiles
    const { data: existingProfile } = await supabase
      .from("kost_profiles")
      .select("id")
      .eq("subdomain", cleanSub)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ error: "Subdomain sudah digunakan oleh kost lain" }, { status: 409 });
    }

    // Cek subdomain tidak bentrok dengan cabang lain
    const { data: existingBranch } = await supabase
      .from("kost_branches")
      .select("id")
      .eq("subdomain", cleanSub)
      .maybeSingle();

    if (existingBranch) {
      return NextResponse.json({ error: "Subdomain sudah digunakan oleh cabang lain" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("kost_branches")
      .insert({
        kost_id:  profile.id,
        nama:     nama.trim().slice(0, 100),
        subdomain: cleanSub,
        alamat:   alamat?.trim() || null,
        telepon:  telepon?.trim() || null,
        tagline:  tagline?.trim() || null,
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

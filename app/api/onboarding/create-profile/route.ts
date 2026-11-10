import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * POST /api/onboarding/create-profile
 * Dipanggil setelah payment sukses di step-4.
 * Membuat kost_profile pertama untuk user yang baru mendaftar.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verifikasi user sudah login
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { namaKost, subdomain, telepon, paket, tagline, alamat } = body;

    if (!namaKost || !subdomain) {
      return NextResponse.json({ error: "namaKost dan subdomain wajib diisi" }, { status: 400 });
    }

    // Cek apakah subdomain sudah dipakai
    const { data: existing } = await supabase
      .from("kost_profiles")
      .select("id")
      .eq("subdomain", subdomain)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Subdomain sudah digunakan. Pilih subdomain lain." }, { status: 409 });
    }

    // Cek apakah user sudah punya profil
    const { data: existingProfile } = await supabase
      .from("kost_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingProfile) {
      // Update profil yang sudah ada
      const { data, error } = await supabase
        .from("kost_profiles")
        .update({
          nama: namaKost,
          subdomain,
          telepon: telepon || "",
          paket: paket || "Pro Plan",
          tagline: tagline || "Hunian nyaman dan strategis",
          alamat: alamat || "",
        })
        .eq("id", existingProfile.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ profile: data, isNew: false });
    }

    // Buat profil baru
    const { data, error } = await supabase
      .from("kost_profiles")
      .insert({
        user_id: user.id,
        nama: namaKost,
        subdomain,
        telepon: telepon || "",
        paket: paket || "Pro Plan",
        tagline: tagline || "Hunian nyaman dan strategis",
        alamat: alamat || "",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data, isNew: true }, { status: 201 });

  } catch (err) {
    console.error("[create-profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

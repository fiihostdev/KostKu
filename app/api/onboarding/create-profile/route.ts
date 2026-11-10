import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { namaKost, subdomain, telepon, paket, tagline, alamat } = body;

    if (!namaKost || !subdomain) {
      return NextResponse.json({ error: "namaKost dan subdomain wajib diisi" }, { status: 400 });
    }

    // Cek subdomain sudah dipakai
    const { data: existing } = await supabase
      .from("kost_profiles")
      .select("id")
      .eq("subdomain", subdomain)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Subdomain sudah digunakan." }, { status: 409 });
    }

    // Cek user sudah punya profil
    const { data: existingProfile } = await supabase
      .from("kost_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingProfile) {
      const { data, error } = await supabase
        .from("kost_profiles")
        .update({ nama: namaKost, subdomain, telepon: telepon || "", paket: paket || "Pro Plan", tagline: tagline || "", alamat: alamat || "" })
        .eq("id", existingProfile.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ profile: data, isNew: false });
    }

    const { data, error } = await supabase
      .from("kost_profiles")
      .insert({ user_id: user.id, nama: namaKost, subdomain, telepon: telepon || "", paket: paket || "Pro Plan", tagline: tagline || "", alamat: alamat || "" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data, isNew: true }, { status: 201 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-profile]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

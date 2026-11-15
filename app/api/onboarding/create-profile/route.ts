import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Reserved subdomains — same list as branches POST
const RESERVED = new Set([
  "www","api","admin","superadmin","app","mail","ftp","cdn","static","media",
  "assets","login","dashboard","kost","new","test","billing","support","help",
]);

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // S1 FIX: IGNORE client-supplied `paket` entirely.
    // Plan can only be changed by a superadmin via the superadmin dashboard.
    // New accounts always start on "starter".
    const { namaKost, subdomain, telepon, tagline, alamat } = body;

    if (!namaKost || !subdomain) {
      return NextResponse.json({ error: "namaKost dan subdomain wajib diisi" }, { status: 400 });
    }

    // S2 FIX: Sanitize + validate subdomain
    const cleanSub = String(subdomain).toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    if (!cleanSub || cleanSub.length < 3) {
      return NextResponse.json({ error: "Subdomain minimal 3 karakter (hanya huruf kecil, angka, tanda hubung)" }, { status: 400 });
    }
    if (cleanSub.length > 30) {
      return NextResponse.json({ error: "Subdomain maksimal 30 karakter" }, { status: 400 });
    }
    if (RESERVED.has(cleanSub)) {
      return NextResponse.json({ error: "Subdomain ini tidak diizinkan. Pilih nama lain." }, { status: 400 });
    }
    if (!cleanSub.match(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/) && cleanSub.length > 1) {
      return NextResponse.json({ error: "Subdomain tidak boleh diawali atau diakhiri tanda hubung." }, { status: 400 });
    }

    // Sanitize text fields
    const safaNama = String(namaKost).trim().slice(0, 100);
    const safaTelepon = telepon ? String(telepon).replace(/[^0-9+\-\s]/g, "").slice(0, 20) : "";
    const safaTagline = tagline ? String(tagline).trim().slice(0, 200) : "";
    const safaAlamat  = alamat  ? String(alamat).trim().slice(0, 300)  : "";

    // Check subdomain uniqueness in kost_profiles
    const { data: existingSub } = await supabase
      .from("kost_profiles")
      .select("id")
      .eq("subdomain", cleanSub)
      .maybeSingle();
    if (existingSub) {
      return NextResponse.json({ error: "Subdomain sudah digunakan." }, { status: 409 });
    }

    // Check subdomain uniqueness in kost_branches
    const { data: existingBranchSub } = await supabase
      .from("kost_branches")
      .select("id")
      .eq("subdomain", cleanSub)
      .maybeSingle();
    if (existingBranchSub) {
      return NextResponse.json({ error: "Subdomain sudah digunakan oleh cabang lain." }, { status: 409 });
    }

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from("kost_profiles")
      .select("id, paket")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfile) {
      // UPDATE — but NEVER update paket (plan can only be changed by superadmin)
      const { data, error } = await supabase
        .from("kost_profiles")
        .update({
          nama:     safaNama,
          subdomain: cleanSub,
          telepon:  safaTelepon,
          tagline:  safaTagline,
          alamat:   safaAlamat,
          // paket intentionally NOT included — superadmin only
        })
        .eq("id", existingProfile.id)
        .select()
        .single();
      if (error) {
        console.error("[create-profile update]", error.message);
        return NextResponse.json({ error: "Gagal memperbarui profil" }, { status: 500 });
      }
      return NextResponse.json({ profile: data, isNew: false });
    }

    // INSERT new profile — always start on "starter"
    const { data, error } = await supabase
      .from("kost_profiles")
      .insert({
        user_id:  user.id,
        nama:     safaNama,
        subdomain: cleanSub,
        telepon:  safaTelepon,
        paket:    "starter",   // S1: hardcoded server-side, NOT from client
        tagline:  safaTagline,
        alamat:   safaAlamat,
      })
      .select()
      .single();

    if (error) {
      console.error("[create-profile insert]", error.message);
      return NextResponse.json({ error: "Gagal membuat profil" }, { status: 500 });
    }
    return NextResponse.json({ profile: data, isNew: true }, { status: 201 });

  } catch (err: unknown) {
    console.error("[create-profile]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

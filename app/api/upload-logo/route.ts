import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil kostId
    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).single();
    if (!profile) {
      return NextResponse.json({ error: "Profil kost tidak ditemukan" }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Validasi size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
    }

    // Validasi type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format file harus JPG, PNG, WebP, atau SVG" }, { status: 400 });
    }

    // Gunakan service role untuk upload (bypass RLS di storage)
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    // Path: {userId}/{kostId}.{ext} — satu logo per kost, otomatis overwrite jika upload ulang
    const filePath = `${user.id}/${profile.id}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error: uploadError } = await supabaseService.storage
      .from("kost-logos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // overwrite jika sudah ada
      });

    if (uploadError) {
      console.error("[upload-logo] Storage error:", uploadError.message);
      return NextResponse.json({ error: `Upload gagal: ${uploadError.message}` }, { status: 500 });
    }

    // Ambil public URL
    const { data: { publicUrl } } = supabaseService.storage
      .from("kost-logos")
      .getPublicUrl(filePath);

    // Tambahkan cache-busting agar browser tidak pakai versi lama
    const logoUrl = `${publicUrl}?v=${Date.now()}`;

    // Simpan URL ke kost_profiles
    const { error: updateError } = await supabaseService
      .from("kost_profiles")
      .update({ logo_url: logoUrl })
      .eq("id", profile.id);

    if (updateError) {
      console.error("[upload-logo] DB update error:", updateError.message);
      return NextResponse.json({ error: `Gagal simpan URL: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, logoUrl });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload-logo]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id, logo_url").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });

    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Hapus semua file logo milik user ini
    const { data: files } = await supabaseService.storage
      .from("kost-logos")
      .list(user.id);

    if (files && files.length > 0) {
      await supabaseService.storage
        .from("kost-logos")
        .remove(files.map((f) => `${user.id}/${f.name}`));
    }

    // Hapus URL dari database
    await supabaseService
      .from("kost_profiles")
      .update({ logo_url: null })
      .eq("id", profile.id);

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

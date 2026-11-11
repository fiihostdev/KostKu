import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isValidQRIS, extractQRISInfo, injectAmountToQRIS } from "@/lib/qris";

/**
 * POST /api/qris/upload
 *
 * Admin simpan konfigurasi QRIS kost-nya.
 * QR decode dilakukan di client (browser) menggunakan jsQR via Canvas API,
 * kemudian QRIS string dikirim ke server bersama gambar untuk disimpan.
 *
 * Form fields:
 *   qr_image:    File   — gambar QR PNG/JPG (opsional, untuk disimpan sebagai preview)
 *   qris_string: string — QRIS string hasil decode (wajib)
 *   label:       string — nama/label QR
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil kost tidak ditemukan" }, { status: 404 });

    const formData   = await request.formData();
    const file       = formData.get("qr_image") as File | null;
    const qrisString = (formData.get("qris_string") as string || "").trim();
    const label      = (formData.get("label") as string) || "QRIS Utama";

    if (!qrisString) {
      return NextResponse.json({ error: "QRIS string wajib diisi" }, { status: 400 });
    }

    // ── Validasi QRIS ─────────────────────────────────────────────────────────
    if (!isValidQRIS(qrisString)) {
      return NextResponse.json({
        error: "Format QRIS tidak valid. Pastikan string diawali '000201' dan merupakan QRIS Bank Indonesia.",
      }, { status: 400 });
    }

    // ── Test inject nominal 1000 ───────────────────────────────────────────────
    let testQris = "";
    try {
      testQris = injectAmountToQRIS(qrisString, 1000);
    } catch (e) {
      return NextResponse.json({ error: `Gagal proses QRIS: ${String(e)}` }, { status: 400 });
    }

    if (!isValidQRIS(testQris)) {
      return NextResponse.json({ error: "QRIS valid tapi tidak dapat dikonversi ke dinamis." }, { status: 400 });
    }

    const info = extractQRISInfo(qrisString);

    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── Upload gambar preview (opsional) ─────────────────────────────────────
    let imageUrl = "";
    if (file && file.size > 0) {
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "Ukuran gambar maksimal 2MB" }, { status: 400 });
      }
      const ext      = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${user.id}/${profile.id}-${Date.now()}.${ext}`;
      const buffer   = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabaseService.storage
        .from("qris-images")
        .upload(filePath, buffer, { contentType: file.type, upsert: false });

      if (!uploadError) {
        const { data: { publicUrl } } = supabaseService.storage
          .from("qris-images")
          .getPublicUrl(filePath);
        imageUrl = publicUrl;
      }
    }

    // ── Simpan ke database ────────────────────────────────────────────────────
    const { data: saved, error: dbError } = await supabaseService
      .from("qris_configs")
      .upsert({
        kost_id:       profile.id,
        label,
        qris_string:   qrisString,
        merchant_name: info.merchantName,
        merchant_city: info.merchantCity,
        qr_image_url:  imageUrl || null,
        is_active:     true,
        updated_at:    new Date().toISOString(),
      }, { onConflict: "kost_id" })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: `Gagal simpan: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success:      true,
      id:           saved.id,
      label:        saved.label,
      merchantName: info.merchantName,
      merchantCity: info.merchantCity,
      isStatic:     info.isStatic,
      imageUrl,
      message:      `QRIS berhasil disimpan! Merchant: ${info.merchantName}`,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[qris/upload]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ configs: [] });

    const { data: configs } = await supabase
      .from("qris_configs")
      .select("id, label, merchant_name, merchant_city, qr_image_url, is_active, updated_at")
      .eq("kost_id", profile.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ configs: configs || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });

    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabaseService.from("qris_configs").delete().eq("kost_id", profile.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isValidQRIS, extractQRISInfo, injectAmountToQRIS } from "@/lib/qris";

/**
 * POST /api/qris/upload
 * Admin upload gambar QR (dari GoPay/DANA/BRI/dll)
 * → extract QRIS string dari gambar → validasi → simpan ke Supabase
 *
 * Form fields:
 *   qr_image: File         — gambar QR PNG/JPG
 *   label:    string       — nama/label QR (misal "GoPay Utama")
 *   qris_string: string?   — opsional: input manual QRIS string jika auto-detect gagal
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
    const label      = (formData.get("label") as string) || "QRIS Utama";
    const manualQris = (formData.get("qris_string") as string) || "";

    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let qrisString = manualQris.trim();
    let imageUrl   = "";

    // ── Jika ada file gambar → upload dulu, lalu decode QR ──────────────────
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
      }

      const ext       = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath  = `${user.id}/${profile.id}-${Date.now()}.${ext}`;
      const buffer    = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabaseService.storage
        .from("qris-images")
        .upload(filePath, buffer, { contentType: file.type, upsert: false });

      if (uploadError) {
        return NextResponse.json({ error: `Upload gagal: ${uploadError.message}` }, { status: 500 });
      }

      const { data: { publicUrl } } = supabaseService.storage
        .from("qris-images")
        .getPublicUrl(filePath);
      imageUrl = publicUrl;

      // ── Decode QR dari gambar menggunakan jsQR ───────────────────────────
      if (!qrisString) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const jsQR = require("jsqr");
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const Jimp = require("jimp");

          const image = await Jimp.read(buffer);
          const { width, height } = image.bitmap;
          // Jimp 0.16 menyimpan pixel data di image.bitmap.data sebagai Buffer
          const uint8 = new Uint8ClampedArray(image.bitmap.data.buffer);
          const result = jsQR(uint8, width, height, { inversionAttempts: "dontInvert" });

          if (result?.data) {
            qrisString = result.data;
          }
        } catch (decodeErr) {
          console.warn("[qris/upload] Auto-decode gagal:", decodeErr);
        }
      }
    }

    // ── Validasi QRIS string ─────────────────────────────────────────────────
    if (!qrisString) {
      return NextResponse.json({
        error: "QRIS string tidak terdeteksi dari gambar. Silakan masukkan QRIS string secara manual.",
        imageUrl,
        needManualInput: true,
      }, { status: 422 });
    }

    if (!isValidQRIS(qrisString)) {
      return NextResponse.json({
        error: "Format QRIS tidak valid. Pastikan QR code berlogo QRIS (Bank Indonesia) dan bukan QR proprietary.",
        imageUrl,
        qrisString: qrisString.slice(0, 50) + "...",
      }, { status: 400 });
    }

    // ── Extract info merchant ─────────────────────────────────────────────────
    const info = extractQRISInfo(qrisString);

    // ── Test inject nominal 1000 untuk verifikasi ─────────────────────────────
    let testQris = "";
    try {
      testQris = injectAmountToQRIS(qrisString, 1000);
    } catch (e) {
      return NextResponse.json({ error: `Gagal proses QRIS: ${String(e)}` }, { status: 400 });
    }

    if (!isValidQRIS(testQris)) {
      return NextResponse.json({ error: "QRIS valid tapi gagal di-convert ke dinamis. Hubungi support." }, { status: 400 });
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
      }, { onConflict: "kost_id" }) // 1 QRIS per kost (upsert)
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

// ── GET: ambil QRIS config kost ini ──────────────────────────────────────────
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

// ── DELETE: hapus QRIS config ─────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
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

    await supabaseService
      .from("qris_configs")
      .delete()
      .eq("kost_id", profile.id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { injectAmountToQRIS, isValidQRIS } from "@/lib/qris";

/**
 * GET /api/qris/generate?kostId=xxx&amount=1500000
 *
 * Endpoint publik (tidak butuh auth) — dipanggil dari halaman publik kost
 * saat penyewa ingin bayar online via QRIS.
 *
 * Returns: image/png — QR code dinamis dengan nominal sudah ter-inject
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const kostId = searchParams.get("kostId");
    const amount = parseInt(searchParams.get("amount") || "0", 10);

    if (!kostId) {
      return NextResponse.json({ error: "kostId wajib diisi" }, { status: 400 });
    }
    if (!amount || amount < 1000) {
      return NextResponse.json({ error: "Amount minimal Rp 1.000" }, { status: 400 });
    }
    if (amount > 50000000) {
      return NextResponse.json({ error: "Amount maksimal Rp 50.000.000" }, { status: 400 });
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ambil QRIS config kost
    const { data: config, error } = await supabase
      .from("qris_configs")
      .select("qris_string, merchant_name, label")
      .eq("kost_id", kostId)
      .eq("is_active", true)
      .single();

    if (error || !config) {
      return NextResponse.json({ error: "QRIS belum dikonfigurasi untuk kost ini" }, { status: 404 });
    }

    // Inject nominal ke QRIS string
    const dynamicQris = injectAmountToQRIS(config.qris_string, amount);

    if (!isValidQRIS(dynamicQris)) {
      return NextResponse.json({ error: "Gagal generate QRIS dinamis" }, { status: 500 });
    }

    // Generate QR code image (PNG)
    const QRCode = (await import("qrcode")).default;

    const qrBuffer = await QRCode.toBuffer(dynamicQris, {
      type:          "png",
      width:         400,
      margin:        2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    // Konversi ke Uint8Array agar kompatibel dengan NextResponse BodyInit
    const uint8 = new Uint8Array(qrBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type":  "image/png",
        "Cache-Control": "no-store, no-cache",
        "X-QRIS-Amount":   String(amount),
        "X-QRIS-Merchant": config.merchant_name || "",
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[qris/generate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/qris/generate
 * Versi dengan body JSON — untuk dipanggil dari admin dashboard
 * Returns: { qrisString, qrImageBase64, amount, merchantName }
 */
export async function POST(request: NextRequest) {
  try {
    const body   = await request.json();
    const { kostId, amount } = body;

    if (!kostId || !amount) {
      return NextResponse.json({ error: "kostId dan amount wajib diisi" }, { status: 400 });
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: config, error } = await supabase
      .from("qris_configs")
      .select("qris_string, merchant_name, label")
      .eq("kost_id", kostId)
      .eq("is_active", true)
      .single();

    if (error || !config) {
      return NextResponse.json({ error: "QRIS belum dikonfigurasi" }, { status: 404 });
    }

    const dynamicQris = injectAmountToQRIS(config.qris_string, Number(amount));

    if (!isValidQRIS(dynamicQris)) {
      return NextResponse.json({ error: "Gagal generate QRIS dinamis" }, { status: 500 });
    }

    const QRCode = (await import("qrcode")).default;
    const qrBase64 = await QRCode.toDataURL(dynamicQris, {
      width:  400,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    return NextResponse.json({
      success:      true,
      qrisString:   dynamicQris,
      qrImageBase64: qrBase64,
      amount,
      merchantName: config.merchant_name,
      label:        config.label,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

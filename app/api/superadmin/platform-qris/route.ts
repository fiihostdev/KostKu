import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/superadmin/platform-qris
 * Upload gambar QR code platform ke Supabase Storage
 * Lalu simpan URL ke platform_config
 */

const SERVICE = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const rl = enforceRateLimit(request, "platform-qris", RATE_LIMITS.UPLOAD);
  if (rl) return rl;

  // Guard: superadmin only
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("kost_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (profile?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    // Validasi ukuran (max 2MB) dan tipe
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
    }
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Hanya PNG/JPG/WebP" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const fileName = `platform-qris/qr_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload ke bucket logos (atau buat bucket baru)
    const { error: uploadErr } = await SERVICE.storage
      .from("logos")
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: urlData } = SERVICE.storage.from("logos").getPublicUrl(fileName);
    const qrisUrl = urlData.publicUrl;

    // Simpan URL ke platform_config
    await SERVICE.from("platform_config").upsert({ key: "qris_image_url", value: qrisUrl }, { onConflict: "key" });

    return NextResponse.json({ success: true, url: qrisUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

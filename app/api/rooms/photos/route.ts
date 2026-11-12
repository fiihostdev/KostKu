import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * POST /api/rooms/photos
 * Upload foto kamar (max 5 foto per kamar, max 5MB per foto)
 * Form: { roomId, photo: File }
 *
 * DELETE /api/rooms/photos
 * Body: { roomId, photoUrl }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });

    const formData = await request.formData();
    const roomId   = formData.get("roomId") as string;
    const file     = formData.get("photo") as File | null;

    if (!roomId || !file) {
      return NextResponse.json({ error: "roomId dan photo wajib diisi" }, { status: 400 });
    }

    // Validasi kamar milik kost ini
    const { data: room } = await supabase
      .from("rooms").select("id, foto_urls").eq("id", roomId).eq("kost_id", profile.id).single();
    if (!room) return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 404 });

    const currentPhotos = (room.foto_urls as string[]) || [];
    if (currentPhotos.length >= 5) {
      return NextResponse.json({ error: "Maksimal 5 foto per kamar" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran foto maksimal 5MB" }, { status: 400 });
    }

    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const ext      = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${user.id}/${roomId}/${Date.now()}.${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseService.storage
      .from("room-photos")
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: `Upload gagal: ${uploadError.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseService.storage
      .from("room-photos")
      .getPublicUrl(filePath);

    const newPhotos = [...currentPhotos, publicUrl];
    const { error: updateError } = await supabaseService
      .from("rooms")
      .update({ foto_urls: newPhotos })
      .eq("id", roomId);

    if (updateError) {
      return NextResponse.json({ error: `Update DB gagal: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, photoUrl: publicUrl, totalPhotos: newPhotos.length });

  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("kost_profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });

    const { roomId, photoUrl } = await request.json();
    if (!roomId || !photoUrl) return NextResponse.json({ error: "roomId dan photoUrl wajib" }, { status: 400 });

    const { data: room } = await supabase
      .from("rooms").select("id, foto_urls").eq("id", roomId).eq("kost_id", profile.id).single();
    if (!room) return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 404 });

    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Hapus dari storage
    try {
      const urlParts = new URL(photoUrl);
      const pathAfterBucket = urlParts.pathname.split("/room-photos/")[1];
      if (pathAfterBucket) {
        await supabaseService.storage.from("room-photos").remove([pathAfterBucket]);
      }
    } catch {}

    // Update DB
    const updatedPhotos = ((room.foto_urls as string[]) || []).filter((p) => p !== photoUrl);
    await supabaseService.from("rooms").update({ foto_urls: updatedPhotos }).eq("id", roomId);

    return NextResponse.json({ success: true, totalPhotos: updatedPhotos.length });

  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

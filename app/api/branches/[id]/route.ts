import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * PATCH /api/branches/[id] — update cabang
 * DELETE /api/branches/[id] — hapus cabang
 */

async function getProfileAndBranch(supabase: ReturnType<typeof createClient>, userId: string, branchId: string) {
  const { data: profile } = await supabase
    .from("kost_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!profile) return { profile: null, branch: null, error: "Profil tidak ditemukan" };

  const { data: branch } = await supabase
    .from("kost_branches")
    .select("*")
    .eq("id", branchId)
    .eq("kost_id", profile.id)
    .single();

  if (!branch) return { profile, branch: null, error: "Cabang tidak ditemukan atau bukan milik Anda" };

  return { profile, branch, error: null };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { profile, error: findErr } = await getProfileAndBranch(supabase, user.id, params.id);
    if (findErr || !profile) return NextResponse.json({ error: findErr }, { status: 404 });

    const body = await request.json();
    const { nama, alamat, telepon, tagline, is_active, logo_url } = body;

    const { data, error } = await supabase
      .from("kost_branches")
      .update({
        ...(nama      !== undefined && { nama: String(nama).trim().slice(0, 100) }),
        ...(alamat    !== undefined && { alamat: alamat?.trim() || null }),
        ...(telepon   !== undefined && { telepon: telepon?.trim() || null }),
        ...(tagline   !== undefined && { tagline: tagline?.trim() || null }),
        ...(is_active !== undefined && { is_active: Boolean(is_active) }),
        ...(logo_url  !== undefined && { logo_url: logo_url?.trim().slice(0, 500) || null }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("kost_id", profile.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Gagal memperbarui cabang" }, { status: 500 });

    return NextResponse.json({ success: true, branch: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { profile, error: findErr } = await getProfileAndBranch(supabase, user.id, params.id);
    if (findErr || !profile) return NextResponse.json({ error: findErr }, { status: 404 });

    const { error } = await supabase
      .from("kost_branches")
      .delete()
      .eq("id", params.id)
      .eq("kost_id", profile.id);

    if (error) return NextResponse.json({ error: "Gagal menghapus cabang" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

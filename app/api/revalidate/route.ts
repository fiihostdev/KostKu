import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

/**
 * POST /api/revalidate
 * Dipanggil setiap kali admin mengubah data kamar/penyewa
 * agar halaman publik kost langsung fresh
 *
 * Body: { subdomain: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Verifikasi user login
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { subdomain } = body;

    if (subdomain) {
      // Revalidate halaman spesifik
      revalidatePath(`/kost/${subdomain}`);
    }

    // Revalidate semua halaman kost (wildcard)
    revalidatePath("/kost/[subdomain]", "page");

    return NextResponse.json({ revalidated: true, subdomain });
  } catch (err) {
    console.error("[revalidate]", err);
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    try {
      const supabase = createClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`);
      }

      if (data.user) {
        // ── KRITIS: Gunakan service_role untuk query profile ──────────────────
        // Jangan gunakan RLS client di sini karena session cookies belum stabil
        // saat callback pertama kali dipanggil — auth.uid() bisa null → no data
        const serviceClient = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data: profile } = await serviceClient
          .from("kost_profiles")
          .select("id, role, subdomain, is_suspended")
          .eq("user_id", data.user.id)
          .maybeSingle(); // maybeSingle tidak throw jika tidak ada row

        // Tidak ada profile → user baru, perlu onboarding
        if (!profile) {
          return NextResponse.redirect(`${origin}/onboarding/step-2`);
        }

        // Akun suspended
        if (profile.is_suspended) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Akun Anda telah disuspend. Hubungi admin.")}`);
        }

        // Superadmin
        if (profile.role === "superadmin") {
          return NextResponse.redirect(`${origin}/superadmin/dashboard`);
        }

        // Admin kost biasa
        return NextResponse.redirect(`${origin}/admin/dashboard`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[auth/callback]", msg);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Terjadi kesalahan. Coba lagi.")}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * OAuth callback handler.
 *
 * Alur:
 * - User baru (belum punya kost_profile) → /onboarding/step-1
 * - User lama (sudah punya kost_profile) → /admin/dashboard
 * - Superadmin → /superadmin/dashboard
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin/dashboard";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`);
    }

    if (data.user) {
      // Cek profil kost user ini
      const { data: profile } = await supabase
        .from("kost_profiles")
        .select("id, role, subdomain")
        .eq("user_id", data.user.id)
        .single();

      if (!profile) {
        // User baru Google → langsung step-2 (nama & email sudah dari Google)
        // User baru email → step-1 sudah dilakukan, lanjut step-2
        return NextResponse.redirect(`${origin}/onboarding/step-2`);
      }

      if (profile.role === "superadmin") {
        return NextResponse.redirect(`${origin}/superadmin/dashboard`);
      }

      // Sudah punya profil → dashboard admin
      return NextResponse.redirect(`${origin}/admin/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}

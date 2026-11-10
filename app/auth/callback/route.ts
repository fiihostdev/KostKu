import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
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
        const { data: profile } = await supabase
          .from("kost_profiles")
          .select("id, role, subdomain")
          .eq("user_id", data.user.id)
          .single();

        if (!profile) return NextResponse.redirect(`${origin}/onboarding/step-2`);
        if (profile.role === "superadmin") return NextResponse.redirect(`${origin}/superadmin/dashboard`);
        return NextResponse.redirect(`${origin}/admin/dashboard`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[auth/callback]", msg);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}

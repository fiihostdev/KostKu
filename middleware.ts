import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Guard: jika env vars tidak di-set, lewati middleware
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // ── Route categories ──────────────────────────────────────────────────────
  const isAdminRoute = pathname.startsWith("/admin");
  const isSuperadminDashboard = pathname.startsWith("/superadmin/dashboard");
  const isSuperadminLogin = pathname === "/superadmin/login";

  // ── /admin/* — harus login, redirect ke /login ────────────────────────────
  if (isAdminRoute && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ── /superadmin/dashboard — harus login DAN role superadmin ──────────────
  if (isSuperadminDashboard) {
    if (!user) {
      // Belum login → ke halaman login superadmin (bukan login biasa)
      return NextResponse.redirect(new URL("/superadmin/login", request.url));
    }

    // Cek role
    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "superadmin") {
      // Login tapi bukan superadmin → ke admin dashboard
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  // ── /superadmin/login — jika sudah login sebagai superadmin, skip login ───
  if (isSuperadminLogin && user) {
    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role === "superadmin") {
      return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

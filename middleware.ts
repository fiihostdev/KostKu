import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const APP_DOMAIN = "fiihost.my.id";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // ── Subdomain routing ────────────────────────────────────────────────────
  // homedesk.fiihost.my.id → rewrite ke /kost/homedesk (hanya non-static paths)
  const isApexDomain = hostname === APP_DOMAIN || hostname === `www.${APP_DOMAIN}`;
  const isSubdomain =
    !isApexDomain &&
    hostname.endsWith(`.${APP_DOMAIN}`) &&
    !hostname.startsWith("www.");

  if (isSubdomain) {
    // Jangan rewrite static assets dan API routes
    const isStaticAsset =
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/api/") ||
      pathname.includes(".") || // file dengan extension (favicon.ico, dll)
      pathname === "/";

    if (!isStaticAsset || pathname === "/") {
      // Ekstrak subdomain: homedesk.fiihost.my.id → homedesk
      const subdomain = hostname.slice(0, hostname.length - APP_DOMAIN.length - 1);

      if (subdomain && subdomain !== "www") {
        // Rewrite ke /kost/[subdomain][path]
        const newPath = pathname === "/" ? `/kost/${subdomain}` : `/kost/${subdomain}${pathname}`;
        const url = request.nextUrl.clone();
        url.pathname = newPath;
        return NextResponse.rewrite(url);
      }
    }

    // Static assets: lewatkan apa adanya
    return NextResponse.next();
  }

  // ── Auth protection untuk non-subdomain routes ───────────────────────────

  // Guard: jika env vars tidak di-set, lewati auth check
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

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

  const { data: { user } } = await supabase.auth.getUser();

  const isAdminRoute = pathname.startsWith("/admin");
  const isSuperadminDashboard = pathname.startsWith("/superadmin/dashboard");
  const isSuperadminLogin = pathname === "/superadmin/login";

  if (isAdminRoute && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isSuperadminDashboard) {
    if (!user) {
      return NextResponse.redirect(new URL("/superadmin/login", request.url));
    }
    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (!profile || profile.role !== "superadmin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

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

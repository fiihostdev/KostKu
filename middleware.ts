import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const APP_DOMAIN = "manajementkost.my.id";
const APP_URL = "https://manajementkost.my.id";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // ── Subdomain routing ─────────────────────────────────────────────────────
  const isApexDomain =
    hostname === APP_DOMAIN ||
    hostname === `www.${APP_DOMAIN}` ||
    hostname.endsWith(".vercel.app");

  const isSubdomain =
    !isApexDomain &&
    hostname.endsWith(`.${APP_DOMAIN}`) &&
    !hostname.startsWith("www.");

  if (isSubdomain) {
    const subdomain = hostname.slice(0, hostname.length - APP_DOMAIN.length - 1);

    if (!subdomain || subdomain === "www") {
      return NextResponse.next();
    }

    // Static assets — JANGAN di-rewrite, biarkan apa adanya
    const isStaticPath =
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/api/") ||
      pathname === "/favicon.ico" ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|map)$/.test(pathname);

    if (isStaticPath) {
      return NextResponse.next();
    }

    // Halaman admin/login/onboarding — redirect ke domain utama
    const isMainAppPath =
      pathname.startsWith("/login") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/superadmin") ||
      pathname.startsWith("/auth");

    if (isMainAppPath) {
      return NextResponse.redirect(`${APP_URL}${pathname}`);
    }

    // Root path "/" — rewrite ke halaman kost publik
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/kost/${subdomain}`;
      return NextResponse.rewrite(url);
    }

    // Path lain di subdomain — rewrite ke /kost/[subdomain]/[path]
    const url = request.nextUrl.clone();
    url.pathname = `/kost/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── Auth protection (hanya untuk apex domain) ────────────────────────────

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

  if (pathname.startsWith("/admin") && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/superadmin/dashboard")) {
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

  if (pathname === "/superadmin/login" && user) {
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

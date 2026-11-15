import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/onboarding/check-subdomain?subdomain=xxx
 * Rate limited: 30 per IP per minute (cegah enumeration oracle)
 */
export async function GET(request: NextRequest) {
  // Rate limit: enumeration protection
  const ip    = getClientIp(request);
  const limit = checkRateLimit(`subdomain-check:${ip}`, { windowMs: 60 * 1000, max: 30 });
  if (!limit.allowed) {
    return NextResponse.json({ available: false, error: "Terlalu banyak percobaan" }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("subdomain") || "";
  const subdomain = raw.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");

  if (!subdomain || subdomain.length < 3) {
    return NextResponse.json({ available: false, error: "Subdomain minimal 3 karakter" }, { status: 400 });
  }
  if (subdomain.length > 30) {
    return NextResponse.json({ available: false, error: "Subdomain maksimal 30 karakter" }, { status: 400 });
  }

  // Reserved subdomains
  const reserved = ["www", "api", "admin", "superadmin", "app", "mail", "ftp", "static", "media", "assets", "cdn"];
  if (reserved.includes(subdomain)) {
    return NextResponse.json({ available: false, subdomain, reason: "reserved" });
  }

  try {
    const supabase = createClient();

    // Check kost_profiles
    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("id")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (profile) {
      return NextResponse.json({ available: false, subdomain });
    }

    // Check kost_branches
    const { data: branch } = await supabase
      .from("kost_branches")
      .select("id")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (branch) {
      return NextResponse.json({ available: false, subdomain });
    }

    return NextResponse.json({ available: true, subdomain });
  } catch {
    return NextResponse.json({ available: false, error: "Internal server error" }, { status: 500 });
  }
}

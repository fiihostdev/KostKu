import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * GET /api/onboarding/check-subdomain?subdomain=xxx
 * Cek apakah subdomain tersedia (tidak dipakai kost_profiles maupun kost_branches)
 * Returns: { available: boolean, subdomain: string }
 */
export async function GET(request: NextRequest) {
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
  } catch (err) {
    return NextResponse.json({ available: false, error: String(err) }, { status: 500 });
  }
}

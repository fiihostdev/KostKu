import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/maps/search?q=alamat
 * Proxy ke Nominatim OSM — menghindari CORS dari browser
 * Rate limited: 30/menit per IP
 */
export async function GET(request: NextRequest) {
  const rl = enforceRateLimit(request, "maps-search", RATE_LIMITS.ENUM_CHECK);
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (!q.trim() || q.trim().length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&countrycodes=id&accept-language=id&addressdetails=1`,
      {
        headers: {
          "User-Agent": "KOSTKU-Platform/1.0 (contact: fiihostdev@gmail.com)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return NextResponse.json([], { status: 200 });

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

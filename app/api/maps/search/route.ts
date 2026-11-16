import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/maps/search?q=alamat          → forward geocode
 * GET /api/maps/search?q=lat,lon&type=reverse → reverse geocode
 * Proxy ke Nominatim OSM — menghindari CORS dari browser
 * Rate limited: 30/menit per IP
 */
export async function GET(request: NextRequest) {
  const rl = enforceRateLimit(request, "maps-search", RATE_LIMITS.ENUM_CHECK);
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q") || "";
  const type = searchParams.get("type") || "forward";

  if (!q.trim() || q.trim().length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    let nominatimUrl: string;

    if (type === "reverse") {
      // q = "lat,lon"
      const parts = q.trim().split(",");
      if (parts.length < 2) return NextResponse.json([], { status: 200 });
      const lat = parts[0].trim();
      const lon = parts[1].trim();
      nominatimUrl =
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=id&addressdetails=1`;
    } else {
      nominatimUrl =
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&countrycodes=id&accept-language=id&addressdetails=1`;
    }

    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "KOSTKU-Platform/1.0 (contact: fiihostdev@gmail.com)",
        "Accept":     "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return NextResponse.json([], { status: 200 });

    const raw = await res.json();

    // Reverse geocode returns single object — wrap to array
    const data = type === "reverse"
      ? (raw && raw.lat ? [raw] : [])
      : raw;

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = enforceRateLimit(request, "revalidate", RATE_LIMITS.MUTATION);
  if (rl) return rl;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { subdomain } = body;

    // M3 FIX: Validate subdomain belongs to caller's kost or branches
    if (subdomain) {
      const cleanSub = String(subdomain).toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (cleanSub) {
        // Check if it's their main kost
        const { data: profile } = await supabase
          .from("kost_profiles")
          .select("id, subdomain")
          .eq("user_id", user.id)
          .single();

        const isMain   = profile?.subdomain === cleanSub;
        let isBranch   = false;

        if (!isMain && profile?.id) {
          const { data: branch } = await supabase
            .from("kost_branches")
            .select("id")
            .eq("kost_id", profile.id)
            .eq("subdomain", cleanSub)
            .maybeSingle();
          isBranch = !!branch;
        }

        if (isMain || isBranch) {
          revalidatePath(`/kost/${cleanSub}`);
        }
      }
    }

    // Always revalidate the template
    revalidatePath("/kost/[subdomain]", "page");

    return NextResponse.json({ revalidated: true });
  } catch (err: unknown) {
    console.error("[revalidate]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { subdomain } = body;

    if (subdomain) revalidatePath(`/kost/${subdomain}`);
    revalidatePath("/kost/[subdomain]", "page");

    return NextResponse.json({ revalidated: true, subdomain });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[revalidate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

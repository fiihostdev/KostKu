import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client untuk Next.js 14
 * Di Next.js 14, cookies() TIDAK return Promise — tidak perlu await
 * Di Next.js 15+, cookies() return Promise — perlu await
 * 
 * Package.json: "next": "^14.2.20" → gunakan sync cookies()
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Diabaikan saat dipanggil dari Server Components (read-only)
          }
        },
      },
    }
  );
}

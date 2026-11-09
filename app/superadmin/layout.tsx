"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Halaman login superadmin tidak pakai layout ini
  if (pathname === "/superadmin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/superadmin/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Bar */}
      <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[16px]">shield</span>
          </div>
          <div>
            <span className="text-sm font-black text-white">KOSTKU</span>
            <span className="text-[10px] font-bold text-primary ml-2 uppercase tracking-widest">
              Superadmin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/dashboard"
            className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">home_work</span>
            <span className="hidden sm:inline">Panel Admin</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">logout</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

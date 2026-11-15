"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  // Skip auth check on login page
  const isLoginPage = pathname === "/superadmin/login";

  useEffect(() => {
    if (isLoginPage) { setVerified(true); setChecking(false); return; }

    async function verifyRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/superadmin/login"); return; }

        const { data: profile } = await supabase
          .from("kost_profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile || profile.role !== "superadmin") {
          await supabase.auth.signOut();
          router.replace("/superadmin/login");
          return;
        }

        setVerified(true);
      } catch {
        router.replace("/superadmin/login");
      } finally {
        setChecking(false);
      }
    }

    verifyRole();
  }, [pathname, isLoginPage, supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/superadmin/login");
  };

  // Show loading state while verifying role
  if (checking && !isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-primary text-[48px] animate-spin block">shield</span>
          <p className="text-slate-400 text-xs font-bold">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  if (!verified && !isLoginPage) return null;

  if (isLoginPage) return <>{children}</>;

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
          {/* Realtime indicator */}
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/admin/dashboard"
            className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">home_work</span>
            <span className="hidden sm:inline">Panel Admin</span>
          </a>
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">logout</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-b border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between gap-2">

          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 drop-shadow-sm shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl skeu-card flex items-center justify-center text-primary shadow-sm">
              <span className="material-symbols-outlined text-[24px] sm:text-[26px]">apartment</span>
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-primary">KOSTKU</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/" className="px-3.5 py-1.5 rounded-xl skeu-inset text-primary font-bold text-xs uppercase tracking-wider">
              Beranda
            </Link>
            <a href="#fitur" className="text-xs uppercase font-bold tracking-wider text-on-surface-variant hover:text-primary transition-colors">
              Fitur
            </a>
            <a href="#cara-kerja" className="text-xs uppercase font-bold tracking-wider text-on-surface-variant hover:text-primary transition-colors">
              Cara Kerja
            </a>
            <a href="#harga" className="text-xs uppercase font-bold tracking-wider text-on-surface-variant hover:text-primary transition-colors">
              Harga
            </a>
          </nav>

          {/* Action Buttons Desktop */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              // Sudah login
              <>
                <Link
                  href="/admin/dashboard"
                  className="skeu-button-secondary text-on-surface px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-white transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">dashboard</span>
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="skeu-button-secondary text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 hover:bg-white"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Keluar
                </button>
              </>
            ) : (
              // Belum login
              <>
                <Link
                  href="/login"
                  className="skeu-button-secondary text-on-surface px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-white transition-colors shadow-sm"
                >
                  Masuk
                </Link>
                <Link
                  href="/onboarding/step-1"
                  className="skeu-button text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1"
                >
                  <span>Daftar Gratis</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <div className="flex sm:hidden items-center gap-2">
            {user ? (
              <Link href="/admin/dashboard" className="skeu-button text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="skeu-button-secondary text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                  Masuk
                </Link>
                <Link href="/onboarding/step-1" className="skeu-button text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                  Daftar
                </Link>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-xl skeu-card flex items-center justify-center text-slate-700"
              aria-label="Toggle Menu"
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-surface/95 backdrop-blur-2xl border-b border-white/60 shadow-xl px-4 pt-3 pb-6 animate-fadeIn">
          <nav className="flex flex-col gap-2 mb-4">
            <Link href="/" onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl skeu-inset text-primary font-bold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">home</span>
              Beranda
            </Link>
            <a href="#fitur" onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl hover:bg-white/60 text-slate-700 font-semibold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">hotel</span>
              Fitur Utama
            </a>
            <a href="#harga" onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl hover:bg-white/60 text-slate-700 font-semibold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">sell</span>
              Paket Harga
            </a>
          </nav>
          <div className="pt-3 border-t border-slate-200/60 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)}
                  className="skeu-button text-white text-center py-2.5 rounded-xl font-bold text-xs shadow-md">
                  Buka Dashboard
                </Link>
                <button onClick={handleLogout}
                  className="skeu-button-secondary text-red-600 text-center py-2.5 rounded-xl font-bold text-xs">
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                  className="skeu-button-secondary text-slate-800 text-center py-2.5 rounded-xl font-bold text-xs">
                  Masuk ke Dashboard
                </Link>
                <Link href="/onboarding/step-1" onClick={() => setMobileMenuOpen(false)}
                  className="skeu-button text-white text-center py-2.5 rounded-xl font-bold text-xs shadow-md">
                  Daftar Gratis Sekarang
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

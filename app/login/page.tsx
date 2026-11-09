"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const supabase = createClient();

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  // ── Email + Password Login ────────────────────────────────────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email atau kata sandi salah. Coba lagi."
          : error.message
      );
      setLoading(false);
      return;
    }

    if (data.user) {
      // Cek profil → tentukan arah redirect
      const { data: profile } = await supabase
        .from("kost_profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      if (!profile) {
        router.push("/onboarding/step-1");
      } else if (profile.role === "superadmin") {
        router.push("/superadmin/dashboard");
      } else {
        router.push(redirectTo);
      }
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 font-sans overflow-hidden relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl skeu-card flex items-center justify-center text-primary shadow-sm">
              <span className="material-symbols-outlined text-[26px]">apartment</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-primary">KOSTKU</span>
          </Link>
          <p className="text-xs text-slate-500 mt-2">Platform Manajemen Kost Modern</p>
        </div>

        <div className="skeu-card p-6 sm:p-8 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="mb-6 pb-4 border-b border-white/60">
            <h2 className="text-base font-black text-slate-900">Masuk ke Dashboard Anda</h2>
            <p className="text-xs text-slate-500 mt-1">
              Kelola kost Anda dari mana saja dan kapan saja.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Google — Cara Tercepat */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full py-3.5 px-4 rounded-xl skeu-card border border-white/80 hover:bg-white flex items-center justify-center gap-3 text-sm font-bold text-slate-800 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 mb-5"
          >
            {googleLoading ? (
              <span className="material-symbols-outlined text-[18px] animate-spin text-primary">sync</span>
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            )}
            <span>{googleLoading ? "Menghubungkan..." : "Masuk dengan Akun Google"}</span>
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-slate-300"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">atau dengan email</span>
            <div className="flex-1 border-t border-slate-300"></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">alternate_email</span>
                <input
                  required
                  type="email"
                  placeholder="usman@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700">Kata Sandi</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-primary hover:underline font-bold"
                >
                  {showPassword ? "Sembunyikan" : "Perlihatkan"}
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">lock</span>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Kata sandi Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl skeu-inset text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  if (!email) { setError("Masukkan email Anda terlebih dahulu."); return; }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/callback`,
                  });
                  if (error) setError(error.message);
                  else setError("✅ Link reset kata sandi telah dikirim ke email Anda.");
                }}
                className="text-[10px] text-primary hover:underline font-bold"
              >
                Lupa kata sandi?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full skeu-button py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Masuk ke Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Links */}
        <div className="mt-5 space-y-3">
          {/* Belum punya akun */}
          <div className="skeu-card p-4 rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-800">Belum punya akun KOSTKU?</p>
              <p className="text-slate-500 text-[11px] mt-0.5">Daftar gratis, mulai dalam 5 menit</p>
            </div>
            <Link
              href="/onboarding/step-1"
              className="skeu-button text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 shadow-sm shrink-0"
            >
              <span>Daftar</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          <Link href="/" className="text-[11px] text-slate-500 hover:text-primary font-semibold flex items-center justify-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[40px] animate-spin">sync</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function SuperadminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Email atau kata sandi salah.");
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Gagal login. Coba lagi.");
      setLoading(false);
      return;
    }

    // Verifikasi role superadmin
    const { data: profile } = await supabase
      .from("kost_profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    if (!profile || profile.role !== "superadmin") {
      await supabase.auth.signOut();
      setError("Akses ditolak. Akun ini bukan superadmin.");
      setLoading(false);
      return;
    }

    router.push("/superadmin/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 font-sans overflow-hidden relative">
      {/* Ambient glow background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">

        {/* Header Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl skeu-card flex items-center justify-center text-primary shadow-lg">
              <span className="material-symbols-outlined text-[36px]">shield</span>
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-primary block">KOSTKU</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em]">
                System Administrator
              </span>
            </div>
          </Link>
        </div>

        {/* Main Card */}
        <div className="skeu-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl">

          {/* Card Header */}
          <div className="mb-6 pb-4 border-b border-white/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl skeu-inset flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[22px]">admin_panel_settings</span>
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900">Panel Kontrol Superadmin</h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Akses terbatas — hanya untuk pengelola platform KOSTKU
                </p>
              </div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="skeu-inset p-3 rounded-xl mb-5 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
            <div className="text-[11px]">
              <span className="font-bold text-slate-700">Koneksi Terenkripsi </span>
              <span className="text-slate-500">— SSL/TLS aktif · Session aman · AES-256</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 uppercase tracking-wider text-[10px]">
                Email Administrator
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
                  alternate_email
                </span>
                <input
                  required
                  type="email"
                  placeholder="admin@kostku.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl skeu-inset text-slate-800 outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                  {showPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
                  lock
                </span>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Kata sandi superadmin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl skeu-inset text-slate-800 outline-none font-medium"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full skeu-button py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    <span>Memverifikasi Akses...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">lock_open</span>
                    <span>Masuk ke Panel Kontrol</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-5 pt-4 border-t border-white/60">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: "security", label: "Encrypted" },
                { icon: "verified_user", label: "Role-based" },
                { icon: "history", label: "Audit Log" },
              ].map((item, i) => (
                <div key={i} className="skeu-inset p-2 rounded-xl flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-[18px]">{item.icon}</span>
                  <span className="text-[10px] font-bold text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 text-center space-y-2">
          <p className="text-[11px] text-slate-500">
            URL ini bersifat rahasia dan tidak dipublikasikan.
          </p>
          <div className="flex items-center justify-center gap-3 text-[11px]">
            <Link href="/" className="text-slate-400 hover:text-primary font-semibold flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-[13px]">home</span>
              Beranda
            </Link>
            <span className="text-slate-600">·</span>
            <Link href="/login" className="text-slate-400 hover:text-primary font-semibold flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-[13px]">person</span>
              Login Admin
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

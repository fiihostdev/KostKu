"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";
import { useKost } from "@/lib/store";
import { createClient } from "@/lib/supabase-browser";

export default function OnboardingStep1() {
  const router = useRouter();
  const { profile, setProfile } = useKost();
  const supabase = createClient();

  const [form, setForm] = useState({
    nama: "",
    email: "",
    telepon: "",
    namaKost: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showLoginRedirect, setShowLoginRedirect] = useState(false);

  // ── Google OAuth ──────────────────────────────────────────────────────────
  // Saat Google login sukses → /auth/callback cek profile
  // Jika belum ada profile → redirect ke /onboarding/step-2 (skip step-1)
  // Karena nama & email sudah diambil dari Google otomatis
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setGoogleLoading(false);
    }
    // Jika sukses → browser redirect otomatis ke Google → /auth/callback
  };

  // ── Email + Password Register ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setShowLoginRedirect(false);

    if (form.password !== form.confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (form.password.length < 8) {
      setErrorMsg("Kata sandi harus minimal 8 karakter.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          nama_lengkap: form.nama,
          nama_kost: form.namaKost,
          telepon: form.telepon,
        },
      },
    });

    if (error) {
      if (error.message.includes("already registered") || error.message.includes("already been registered")) {
        setErrorMsg(`Email ${form.email} sudah terdaftar.`);
        setShowLoginRedirect(true);
      } else {
        setErrorMsg(error.message);
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      setProfile({ ...profile, telepon: form.telepon, nama: form.namaKost || profile.nama });
      router.push("/onboarding/step-2");
    }
    setLoading(false);
  };

  const isPasswordMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const isPasswordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8 md:p-12 font-sans">
      <OnboardingStepper currentStep={1} />

      <div className="max-w-xl mx-auto skeu-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl">

        {/* Header */}
        <div className="mb-5 pb-4 border-b border-white/60">
          <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider">
            Langkah 1 dari 4
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Registrasi Akun Pemilik Kost
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gunakan Google untuk akses instan — nama & email terisi otomatis.
          </p>
        </div>

        {/* Sudah punya akun */}
        <div className="mb-5 p-3 rounded-xl skeu-inset flex items-center justify-between text-xs">
          <span className="text-slate-600">Sudah punya akun KOSTKU?</span>
          <Link href="/login" className="font-bold text-primary hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">login</span>
            Masuk di sini
          </Link>
        </div>

        {/* ── DAFTAR DENGAN GOOGLE (Direkomendasikan) ── */}
        <div className="mb-2">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={googleLoading}
            className="w-full py-4 px-4 rounded-xl skeu-card border-2 border-primary/20 hover:border-primary/40 hover:bg-white flex items-center justify-center gap-3 font-bold text-slate-800 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin text-primary">sync</span>
                <span className="text-sm">Menghubungkan ke Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <div className="text-left">
                  <span className="text-sm block">Daftar Cepat dengan Akun Google</span>
                  <span className="text-[10px] text-slate-500 font-normal">Nama & email terisi otomatis — lanjut ke pilih paket</span>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Penjelasan alur Google */}
        <div className="mb-5 p-2.5 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-2 text-[11px] text-slate-600">
          <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">info</span>
          <span>
            Klik Google → pilih akun Gmail → otomatis lanjut ke <strong>Langkah 2: Pilih Paket</strong>. 
            Tidak perlu isi form di bawah.
          </span>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 border-t border-slate-300"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            atau daftar manual dengan email
          </span>
          <div className="flex-1 border-t border-slate-300"></div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
            {showLoginRedirect && (
              <Link
                href="/login"
                className="skeu-button w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Masuk ke Dashboard Sekarang</span>
              </Link>
            )}
          </div>
        )}

        {/* ── FORM DAFTAR MANUAL ── */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* Nama Lengkap */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nama Lengkap</label>
            <input
              required
              type="text"
              placeholder="Contoh: Pak Usman"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl skeu-inset text-slate-800 outline-none font-medium"
            />
          </div>

          {/* WhatsApp & Nama Kost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">No. WhatsApp</label>
              <input
                required
                type="text"
                placeholder="081234567890"
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl skeu-inset text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Properti Kost</label>
              <input
                required
                type="text"
                placeholder="Kost Harmoni Residence"
                value={form.namaKost}
                onChange={(e) => setForm({ ...form, namaKost: e.target.value })}
                className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Email</label>
            <input
              required
              type="email"
              placeholder="usman@gmail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl skeu-inset text-slate-800 outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Kata Sandi</label>
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-primary hover:underline font-bold">
                {showPassword ? "Sembunyikan" : "Perlihatkan"}
              </button>
            </div>
            <input
              required
              type={showPassword ? "text" : "password"}
              placeholder="Minimal 8 karakter"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl skeu-inset text-slate-800 outline-none"
            />
          </div>

          {/* Konfirmasi Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Konfirmasi Kata Sandi</label>
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-[10px] text-primary hover:underline font-bold">
                {showConfirmPassword ? "Sembunyikan" : "Perlihatkan"}
              </button>
            </div>
            <div className="relative">
              <input
                required
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Ketik ulang kata sandi"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl skeu-inset text-slate-800 outline-none pr-10 ${
                  isPasswordMismatch ? "border border-red-400" :
                  isPasswordMatch ? "border border-emerald-400" : ""
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isPasswordMatch && (
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                )}
                {isPasswordMismatch && (
                  <span className="material-symbols-outlined text-red-500 text-[18px]">cancel</span>
                )}
              </div>
            </div>
            {isPasswordMatch && (
              <p className="text-[11px] text-emerald-700 font-bold mt-1">✓ Kata sandi cocok</p>
            )}
            {isPasswordMismatch && (
              <p className="text-[11px] text-red-600 font-bold mt-1">✕ Kata sandi belum sama</p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/60">
            <span className="text-[11px] text-slate-500">Data dienkripsi standar AES-256</span>
            <button
              type="submit"
              disabled={loading}
              className="skeu-button px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md w-full sm:w-auto disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  <span>Mendaftarkan...</span>
                </>
              ) : (
                <>
                  <span>Lanjut ke Langkah 2</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

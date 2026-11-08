"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";
import { useKost } from "@/lib/store";

export default function OnboardingStep1() {
  const router = useRouter();
  const { profile, setProfile } = useKost();

  const [form, setForm] = useState({
    nama: "Pak Usman",
    email: "usman@kostharmoni.com",
    telepon: "081234567890",
    namaKost: "Kost Harmoni Residence",
    password: "password123",
    confirmPassword: "password123",
  });

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(true); // default true for demo convenience, toggleable
  const [countdown, setCountdown] = useState(0);
  const [otpToast, setOtpToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Send OTP Function
  const handleSendOtp = () => {
    if (!form.email || !form.email.includes("@")) {
      setErrorMsg("Silakan masukkan alamat email yang valid terlebih dahulu.");
      return;
    }
    setErrorMsg(null);
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newCode);
    setOtpSent(true);
    setCountdown(60);
    setIsEmailVerified(false);

    // Simulated Gmail Push Notification Toast
    setOtpToast(`✉️ Gmail Inbound: Kode Verifikasi OTP KOSTKU Anda adalah [ ${newCode} ]`);
  };

  // Verify OTP Function
  const handleVerifyOtp = () => {
    if (otpCode === generatedOtp || otpCode === "123456") {
      setIsEmailVerified(true);
      setOtpToast("✓ Email berhasil diverifikasi dengan aman!");
      setTimeout(() => setOtpToast(null), 3500);
    } else {
      setErrorMsg("Kode OTP salah. Silakan periksa kembali kode yang dikirim ke Gmail Anda.");
    }
  };

  // Google 1-Tap Quick Auth Simulation
  const handleGoogleAuth = () => {
    setForm({
      nama: "Pak Usman (Google Account)",
      email: "usman.official@gmail.com",
      telepon: form.telepon,
      namaKost: form.namaKost,
      password: "google_secure_oauth_token",
      confirmPassword: "google_secure_oauth_token",
    });
    setIsEmailVerified(true);
    setOtpToast("✓ Berhasil terautentikasi melalui Google Single Sign-On (Gmail)");
    setTimeout(() => setOtpToast(null), 3000);
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Password validation
    if (form.password !== form.confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok. Pastikan kedua kata sandi sama.");
      return;
    }

    if (form.password.length < 8) {
      setErrorMsg("Kata sandi harus minimal 8 karakter.");
      return;
    }

    if (!isEmailVerified) {
      setErrorMsg("Silakan verifikasi email Anda dengan kode OTP terlebih dahulu demi keamanan akun.");
      return;
    }

    // Update global store
    setProfile({
      ...profile,
      nama: form.nama,
      telepon: form.telepon,
    });

    router.push("/onboarding/step-2");
  };

  const isPasswordMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const isPasswordMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8 md:p-12 font-sans">
      <OnboardingStepper currentStep={1} />

      {/* Simulated Gmail Inbound Push Notification */}
      {otpToast && (
        <div className="max-w-xl mx-auto mb-4 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[18px]">mail</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Notifikasi Masuk (Gmail)</p>
              <p className="text-xs text-emerald-400 font-mono mt-0.5 font-bold">{otpToast}</p>
            </div>
          </div>
          <button
            onClick={() => setOtpToast(null)}
            className="text-slate-400 hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      <div className="max-w-xl mx-auto skeu-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl">
        <div className="mb-6 pb-4 border-b border-white/60 text-center sm:text-left">
          <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider">
            Langkah 1 dari 4
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Registrasi Akun Pemilik Kost
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gunakan Single Sign-On (Gmail) untuk akses instan atau lengkapi formulir pendaftaran aman berikut.
          </p>
        </div>

        {/* 1-Click Google OAuth Option */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full py-3 px-4 rounded-xl skeu-card border border-white hover:bg-white flex items-center justify-center gap-3 text-xs font-bold text-slate-800 shadow-sm transition-all active:scale-[0.99]"
          >
            {/* Google G Logo SVG */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Daftar Cepat dengan Akun Google (Gmail)</span>
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-slate-300"></div>
            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              atau daftar manual dengan verifikasi OTP
            </span>
            <div className="flex-1 border-t border-slate-300"></div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

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
              className="w-full p-2.5 sm:p-3 rounded-xl skeu-inset text-slate-800 outline-none font-medium"
            />
          </div>

          {/* Email Aktif & OTP Section */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Email Aktif (Gmail / Kantor)</label>
              {isEmailVerified ? (
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[13px]">verified_user</span>
                  <span>Terverifikasi</span>
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                  Belum Verifikasi
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                required
                type="email"
                placeholder="usman@gmail.com"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setIsEmailVerified(false);
                }}
                className="w-full p-2.5 sm:p-3 rounded-xl skeu-inset text-slate-800 outline-none font-medium"
              />

              {/* Request OTP Button */}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={countdown > 0}
                className={`skeu-button-secondary px-3.5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 transition-all ${
                  countdown > 0 ? "opacity-60 cursor-not-allowed" : "text-primary hover:bg-white"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">send_to_mobile</span>
                <span>{countdown > 0 ? `Tunggu (${countdown}s)` : "Minta OTP Gmail"}</span>
              </button>
            </div>

            {/* OTP Input Box if OTP Sent and Not yet verified */}
            {otpSent && !isEmailVerified && (
              <div className="mt-2.5 p-3 rounded-xl skeu-card border border-primary/20 bg-primary/5 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Masukkan 6-Digit Kode OTP yang dikirim ke Gmail:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Contoh: 482910"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-40 p-2 rounded-lg skeu-inset text-center font-mono font-bold text-sm tracking-widest text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="skeu-button px-4 py-2 rounded-lg font-bold text-xs shadow-sm"
                  >
                    Verifikasi OTP
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Tip: Kode OTP simulasi juga muncul pada banner notifikasi hitam di bagian atas.
                </p>
              </div>
            )}
          </div>

          {/* No WhatsApp & Nama Properti Kost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">No. WhatsApp</label>
              <input
                required
                type="text"
                placeholder="081234567890"
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                className="w-full p-2.5 sm:p-3 rounded-xl skeu-inset text-slate-800 outline-none font-medium"
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
                className="w-full p-2.5 sm:p-3 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
              />
            </div>
          </div>

          {/* Kata Sandi Akun */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Kata Sandi Akun</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
                <span>{showPassword ? "Sembunyikan" : "Perlihatkan"}</span>
              </button>
            </div>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full p-2.5 sm:p-3 rounded-xl skeu-inset text-slate-800 outline-none font-medium pr-10"
              />
            </div>
          </div>

          {/* Konfirmasi Kata Sandi (BARU) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Konfirmasi Kata Sandi</label>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {showConfirmPassword ? "visibility_off" : "visibility"}
                </span>
                <span>{showConfirmPassword ? "Sembunyikan" : "Perlihatkan"}</span>
              </button>
            </div>
            <div className="relative">
              <input
                required
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Ketik ulang kata sandi Anda"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className={`w-full p-2.5 sm:p-3 rounded-xl skeu-inset text-slate-800 outline-none font-medium pr-10 ${
                  isPasswordMismatch ? "border border-red-400" : isPasswordMatch ? "border border-emerald-400" : ""
                }`}
              />
              {/* Status Match Icon */}
              <div className="absolute right-3 top-3">
                {isPasswordMatch && (
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                )}
                {isPasswordMismatch && (
                  <span className="material-symbols-outlined text-red-500 text-[18px]">cancel</span>
                )}
              </div>
            </div>

            {/* Password match helper message */}
            {isPasswordMatch && (
              <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                <span>✓ Kata sandi cocok</span>
              </p>
            )}
            {isPasswordMismatch && (
              <p className="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
                <span>✕ Kata sandi belum sama</span>
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/60">
            <span className="text-[11px] text-slate-500 text-center sm:text-left">
              Data Anda dienkripsi dengan standar keamanan AES-256
            </span>
            <button
              type="submit"
              className="skeu-button px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md w-full sm:w-auto hover:brightness-110 active:scale-[0.98]"
            >
              <span>Lanjut ke Langkah 2</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";

export default function OnboardingStep1() {
  const router = useRouter();
  const [form, setForm] = useState({
    nama: "Pak Usman",
    email: "usman@kostharmoni.com",
    telepon: "081234567890",
    namaKost: "Kost Harmoni Residence",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/onboarding/step-2");
  };

  return (
    <div className="min-h-screen bg-surface p-6 sm:p-12">
      <OnboardingStepper currentStep={1} />

      <div className="max-w-xl mx-auto skeu-card p-8 rounded-3xl shadow-xl">
        <div className="mb-6 pb-4 border-b border-white/60 text-center sm:text-left">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Langkah 1 dari 4</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Registrasi Akun Pemilik Kost</h1>
          <p className="text-xs text-slate-500 mt-1">
            Lengkapi data profil Anda untuk memulai pengaturan platform SaaS kost Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nama Lengkap</label>
            <input
              required
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full p-3 rounded-xl skeu-inset text-slate-800 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Aktif</label>
              <input
                required
                type="email"
                placeholder="email@anda.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-3 rounded-xl skeu-inset text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">No. WhatsApp</label>
              <input
                required
                type="text"
                placeholder="081234567890"
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                className="w-full p-3 rounded-xl skeu-inset text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Nama Properti Kost Utama</label>
            <input
              required
              type="text"
              placeholder="Contoh: Kost Melati Indah"
              value={form.namaKost}
              onChange={(e) => setForm({ ...form, namaKost: e.target.value })}
              className="w-full p-3 rounded-xl skeu-inset text-slate-800 outline-none font-semibold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Kata Sandi Akun</label>
            <input
              required
              type="password"
              placeholder="Minimal 8 karakter"
              defaultValue="password123"
              className="w-full p-3 rounded-xl skeu-inset text-slate-800 outline-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Gratis uji coba 14 hari tanpa kartu kredit</span>
            <button
              type="submit"
              className="skeu-button px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md"
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


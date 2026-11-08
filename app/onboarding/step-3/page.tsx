"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";

export default function OnboardingStep3() {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState("harmoni");
  const [isAvailable, setIsAvailable] = useState(true);

  const handleSubdomainChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(sanitized);
    setIsAvailable(sanitized.length >= 3);
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAvailable && subdomain.length >= 3) {
      router.push(`/onboarding/step-4?subdomain=${subdomain}`);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 sm:p-12">
      <OnboardingStepper currentStep={3} />

      <div className="max-w-xl mx-auto skeu-card p-8 rounded-3xl shadow-xl">
        <div className="mb-6 pb-4 border-b border-white/60 text-center sm:text-left">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Langkah 3 dari 4</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Pilih Alamat Subdomain Kost Anda</h1>
          <p className="text-xs text-slate-500 mt-1">
            Alamat web ini akan menjadi link resmi profil kost Anda yang dapat diakses oleh publik dan calon penyewa.
          </p>
        </div>

        <form onSubmit={handleNext} className="space-y-6 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-2">Tentukan Subdomain</label>
            <div className="flex items-center">
              <input
                required
                type="text"
                placeholder="namakost"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                className="w-full p-3 rounded-l-xl skeu-inset text-slate-900 outline-none font-mono text-sm font-bold"
              />
              <span className="p-3 bg-slate-200 text-slate-700 rounded-r-xl font-mono text-sm font-semibold border-l border-slate-300">
                .kostku.id
              </span>
            </div>

            {isAvailable ? (
              <p className="text-emerald-700 text-[11px] font-semibold mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Subdomain <strong>{subdomain}.kostku.id</strong> tersedia!</span>
              </p>
            ) : (
              <p className="text-red-600 text-[11px] font-semibold mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>Minimal 3 karakter alphanumeric.</span>
              </p>
            )}
          </div>

          {/* Live Preview Badge */}
          <div className="skeu-inset p-4 rounded-2xl border border-white/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Preview Alamat Publik:
            </span>
            <div className="flex items-center gap-2 text-primary font-mono font-bold text-sm">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>https://{subdomain || "namakost"}.kostku.id</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Dilengkapi sertifikat keamanan SSL gratis otomatis tanpa biaya tambahan.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push("/onboarding/step-2")}
              className="skeu-button-secondary px-5 py-2.5 rounded-xl text-xs font-semibold"
            >
              ← Kembali
            </button>
            <button
              type="submit"
              disabled={!isAvailable}
              className="skeu-button px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <span>Lanjut ke Pembayaran</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


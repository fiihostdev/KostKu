"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id";
import { createClient } from "@/lib/supabase-browser";

function Step3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams?.get("plan") || "pro";

  const [subdomain, setSubdomain] = useState("kostsaya");
  const [namaKost, setNamaKost] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checkTimeout, setCheckTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const supabase = createClient();

  // Ambil nama kost dari user metadata (diisi saat registrasi)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.nama_kost) {
        const nama = user.user_metadata.nama_kost as string;
        setNamaKost(nama);
        // Auto-generate subdomain dari nama kost
        const auto = nama
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .slice(0, 30);
        setSubdomain(auto || "kostsaya");
      }
    });
  }, [supabase]);

  // Cek ketersediaan subdomain dengan debounce
  const handleSubdomainChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(sanitized);
    setIsAvailable(null);

    if (checkTimeout) clearTimeout(checkTimeout);
    if (sanitized.length < 3) return;

    setIsChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("kost_profiles")
        .select("id")
        .eq("subdomain", sanitized)
        .single();
      setIsAvailable(!data); // tersedia jika tidak ada data
      setIsChecking(false);
    }, 500);
    setCheckTimeout(t);
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAvailable && subdomain.length >= 3) {
      router.push(
        `/onboarding/step-4?subdomain=${subdomain}&plan=${plan}&nama=${encodeURIComponent(namaKost)}`
      );
    }
  };

  const canProceed = isAvailable === true && subdomain.length >= 3;

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8 md:p-12 font-sans">
      <OnboardingStepper currentStep={3} />

      <div className="max-w-xl mx-auto skeu-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl">
        <div className="mb-6 pb-4 border-b border-white/60 text-center sm:text-left">
          <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider">
            Langkah 3 dari 4
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Pilih Alamat Subdomain Kost
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Alamat web ini akan menjadi link publik profil kost Anda untuk calon penyewa.
          </p>
        </div>

        <form onSubmit={handleNext} className="space-y-5 text-xs">
          {/* Nama Kost */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nama Properti Kost</label>
            <input
              required
              type="text"
              placeholder="Kost Harmoni Residence"
              value={namaKost}
              onChange={(e) => setNamaKost(e.target.value)}
              className="w-full p-2.5 sm:p-3 rounded-xl skeu-inset text-slate-800 outline-none font-bold"
            />
          </div>

          {/* Subdomain */}
          <div>
            <label className="font-bold text-slate-700 block mb-2">
              Tentukan Subdomain
            </label>
            <div className="flex items-center w-full">
              <input
                required
                type="text"
                placeholder="namakost"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-l-xl skeu-inset text-slate-900 outline-none font-mono text-xs sm:text-sm font-bold min-w-0"
              />
              <span className="p-2.5 sm:p-3 bg-slate-200 text-slate-700 rounded-r-xl font-mono text-xs sm:text-sm font-bold border-l border-slate-300 shrink-0">
                .{APP_DOMAIN}
              </span>
            </div>

            {/* Status ketersediaan */}
            <div className="mt-2 h-5 flex items-center">
              {isChecking && (
                <p className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                  <span>Memeriksa ketersediaan...</span>
                </p>
              )}
              {!isChecking && isAvailable === true && subdomain.length >= 3 && (
                <p className="text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span><strong>{subdomain}.{APP_DOMAIN}</strong> tersedia!</span>
                </p>
              )}
              {!isChecking && isAvailable === false && (
                <p className="text-red-600 text-[11px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>Subdomain sudah digunakan. Coba yang lain.</span>
                </p>
              )}
              {!isChecking && isAvailable === null && subdomain.length > 0 && subdomain.length < 3 && (
                <p className="text-amber-600 text-[11px] font-bold">
                  Minimal 3 karakter.
                </p>
              )}
            </div>
          </div>

          {/* Live Preview */}
          <div className="skeu-inset p-3.5 sm:p-4 rounded-xl border border-white/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Preview Alamat Publik:
            </span>
            <div className="flex items-center gap-2 text-primary font-mono font-bold text-xs sm:text-sm break-all">
              <span className="material-symbols-outlined text-[18px] shrink-0">lock</span>
              <span>https://{subdomain || "namakost"}.{APP_DOMAIN}</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-2">
              SSL gratis otomatis. Bisa diakses penyewa kapan saja.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-between gap-3 border-t border-white/60">
            <button
              type="button"
              onClick={() => router.push("/onboarding/step-2")}
              className="skeu-button-secondary px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold"
            >
              ← Kembali
            </button>
            <button
              type="submit"
              disabled={!canProceed}
              className="skeu-button px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
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

export default function OnboardingStep3() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[40px] animate-spin">sync</span>
      </div>
    }>
      <Step3Content />
    </Suspense>
  );
}

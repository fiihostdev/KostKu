"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";
import MidtransModal from "@/components/payment/MidtransModal";
import { Suspense } from "react";

const PLAN_PRICES: Record<string, number> = {
  starter: 99000,
  pro: 199000,
  enterprise: 399000,
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Paket Starter",
  pro: "Paket Pro",
  enterprise: "Paket Enterprise",
};

function Step4Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subdomain = searchParams.get("subdomain") || "kostsaya";
  const plan = searchParams.get("plan") || "pro";
  const namaKost = searchParams.get("nama") || "Kost Saya";

  const planPrice = PLAN_PRICES[plan] || 199000;
  const planLabel = PLAN_LABELS[plan] || "Paket Pro";

  const [showMidtrans, setShowMidtrans] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMidtransSuccess = async () => {
    setShowMidtrans(false);
    setIsCreating(true);
    setError(null);

    try {
      // Buat kost_profile di Supabase via API route
      const res = await fetch("/api/onboarding/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaKost,
          subdomain,
          paket: planLabel,
          tagline: "Hunian nyaman, bersih, dan strategis",
          telepon: "",
          alamat: "",
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Gagal membuat profil kost. Coba lagi.");
        setIsCreating(false);
        return;
      }

      // Sukses → arahkan ke dashboard
      router.push("/admin/dashboard");

    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 font-sans">
        <div className="skeu-card p-8 rounded-2xl text-center space-y-4 max-w-sm w-full mx-4">
          <span className="material-symbols-outlined text-primary text-[48px] animate-spin block">sync</span>
          <h2 className="font-black text-slate-900 text-lg">Mengaktifkan Akun...</h2>
          <p className="text-xs text-slate-500">
            Menyiapkan dashboard dan subdomain <strong>{subdomain}.kostku.id</strong> untuk Anda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8 md:p-12 font-sans">
      <OnboardingStepper currentStep={4} />

      {/* Midtrans Modal */}
      <MidtransModal
        isOpen={showMidtrans}
        grossAmount={planPrice}
        orderId={`ONBOARD-${subdomain}-${Date.now().toString().slice(-6)}`}
        itemName={`${planLabel} KOSTKU`}
        customerName="Pemilik Kost"
        onClose={() => setShowMidtrans(false)}
        onSuccess={handleMidtransSuccess}
      />

      <div className="max-w-xl mx-auto skeu-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl">
        <div className="mb-6 pb-4 border-b border-white/60 text-center sm:text-left">
          <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider">
            Langkah Terakhir
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Pembayaran & Aktivasi Akun
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Selesaikan tagihan langganan untuk mengaktifkan subdomain dan dashboard Anda.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Order Summary */}
        <div className="skeu-card p-4 rounded-xl mb-5 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Paket Dipilih:</span>
            <span className="font-bold text-slate-900">{planLabel}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Nama Kost:</span>
            <span className="font-bold text-slate-900">{namaKost}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Subdomain:</span>
            <span className="font-mono font-bold text-primary">{subdomain}.kostku.id</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Biaya Setup & SSL:</span>
            <span className="font-bold text-emerald-600">GRATIS</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between text-xs sm:text-sm font-bold text-slate-900">
            <span>Total Pembayaran:</span>
            <span className="text-primary text-base font-black">
              Rp {planPrice.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="skeu-card p-4 rounded-xl border-2 border-primary/30 mb-6 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">
                Midtrans Snap Payment Gateway
              </p>
              <p className="text-[11px] text-slate-500">
                QRIS (GoPay, OVO, ShopeePay), BCA VA, Mandiri VA, BNI VA
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/onboarding/step-3")}
            className="skeu-button-secondary px-4 py-2.5 rounded-xl text-xs font-bold text-center"
          >
            ← Kembali
          </button>
          <button
            onClick={() => setShowMidtrans(true)}
            className="skeu-button px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">credit_card</span>
            <span>Bayar & Aktifkan Sekarang</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingStep4() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[40px] animate-spin">sync</span>
      </div>
    }>
      <Step4Content />
    </Suspense>
  );
}

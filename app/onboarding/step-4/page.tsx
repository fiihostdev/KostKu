"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";

export default function OnboardingStep4() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFinish = () => {
    setIsProcessing(true);
    setTimeout(() => {
      alert("Selamat! Pembayaran berhasil diverifikasi. Akun SaaS Kostku Anda kini aktif sepenuhnya!");
      router.push("/admin/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8 md:p-12">
      <OnboardingStepper currentStep={4} />

      <div className="max-w-xl mx-auto skeu-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl">
        <div className="mb-6 pb-4 border-b border-white/60 text-center sm:text-left">
          <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider">Langkah Terakhir</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Pembayaran & Aktivasi Akun</h1>
          <p className="text-xs text-slate-500 mt-1">
            Selesaikan tagihan langganan via Midtrans untuk mengaktifkan subdomain Anda.
          </p>
        </div>

        {/* Order Summary */}
        <div className="skeu-card p-4 rounded-xl mb-5 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Paket Dipilih:</span>
            <span className="font-bold text-slate-900">Paket Pro (Bulanan)</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Subdomain:</span>
            <span className="font-mono font-bold text-primary">harmoni.kostku.id</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Biaya Setup & SSL:</span>
            <span className="font-bold text-emerald-600">GRATIS</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between text-xs sm:text-sm font-bold text-slate-900">
            <span>Total Pembayaran:</span>
            <span className="text-primary text-base font-black">Rp 199.000</span>
          </div>
        </div>

        {/* Payment Channels */}
        <div className="space-y-2.5 mb-5">
          <label className="font-bold text-xs text-slate-700 block">Metode Pembayaran</label>

          <div
            onClick={() => setPaymentMethod("qris")}
            className={`skeu-card p-3 sm:p-4 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-all ${
              paymentMethod === "qris" ? "border-2 border-primary" : ""
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <span className="material-symbols-outlined text-primary text-[22px] sm:text-[24px] shrink-0">qr_code_scanner</span>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">QRIS (GoPay, OVO, ShopeePay, BCA)</p>
                <p className="text-[10px] text-slate-500 truncate">Scan QR otomatis terverifikasi</p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                paymentMethod === "qris" ? "border-primary bg-primary text-white" : "border-slate-300"
              }`}
            >
              {paymentMethod === "qris" && <span className="material-symbols-outlined text-[12px]">check</span>}
            </div>
          </div>

          <div
            onClick={() => setPaymentMethod("va")}
            className={`skeu-card p-3 sm:p-4 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-all ${
              paymentMethod === "va" ? "border-2 border-primary" : ""
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <span className="material-symbols-outlined text-indigo-600 text-[22px] sm:text-[24px] shrink-0">account_balance</span>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">Virtual Account (BCA, Mandiri, BRI, BNI)</p>
                <p className="text-[10px] text-slate-500 truncate">Transfer m-banking otomatis</p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                paymentMethod === "va" ? "border-primary bg-primary text-white" : "border-slate-300"
              }`}
            >
              {paymentMethod === "va" && <span className="material-symbols-outlined text-[12px]">check</span>}
            </div>
          </div>
        </div>

        {/* QR Code Container */}
        {paymentMethod === "qris" && (
          <div className="skeu-inset p-4 rounded-2xl text-center mb-5">
            <div className="w-32 h-32 bg-white mx-auto rounded-xl p-2 shadow-inner border border-slate-200 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-slate-800">qr_code_2</span>
                <span className="block text-[8px] font-mono text-slate-400">MIDTRANS QRIS</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 font-medium">
              Scan QR code dengan e-wallet / mobile banking Anda.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/onboarding/step-3")}
            className="skeu-button-secondary px-4 py-2.5 rounded-xl text-xs font-bold text-center"
          >
            ← Kembali
          </button>
          <button
            onClick={handleFinish}
            disabled={isProcessing}
            className="skeu-button px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                <span>Memproses Verifikasi...</span>
              </>
            ) : (
              <>
                <span>Saya Sudah Membayar & Buka Dashboard</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";

export default function OnboardingStep2() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("pro");

  const plans = [
    {
      id: "starter",
      name: "Paket Starter",
      price: "Rp 99.000",
      desc: "Hingga 15 Kamar • 1 Properti",
      features: ["Website Subdomain Gratis", "Manajemen Kamar & Penyewa", "Laporan Arus Kas Dasar"],
    },
    {
      id: "pro",
      name: "Paket Pro (Rekomendasi)",
      price: "Rp 199.000",
      badge: "Paling Populer",
      desc: "Hingga 50 Kamar • 3 Properti Kost",
      features: ["Semua Fitur Starter", "WhatsApp Tagihan Otomatis", "Payment Gateway Midtrans (QRIS/VA)", "Laporan Laba Rugi Real-time"],
    },
    {
      id: "enterprise",
      name: "Paket Enterprise",
      price: "Rp 399.000",
      desc: "Kamar & Properti Tanpa Batas",
      features: ["Semua Fitur Pro", "Multi-Admin Operator", "Kustom Domain Penuh", "Superadmin Multi-Kost Terpusat"],
    },
  ];

  const handleNext = () => {
    router.push(`/onboarding/step-3?plan=${selectedPlan}`);
  };

  return (
    <div className="min-h-screen bg-surface p-6 sm:p-12">
      <OnboardingStepper currentStep={2} />

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Langkah 2 dari 4</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Pilih Paket Langganan KOSTKU</h1>
          <p className="text-xs text-slate-500 mt-1">
            Paket dapat ditingkatkan atau diturunkan sewaktu-waktu sesuai perkembangan bisnis kost Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`skeu-card p-6 rounded-2xl cursor-pointer flex flex-col justify-between transition-all relative ${
                  isSelected ? "border-2 border-primary shadow-xl scale-[1.02]" : "hover:border-slate-300"
                }`}
              >
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase">
                    {p.badge}
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected ? "bg-primary border-primary text-white" : "border-slate-300"
                      }`}
                    >
                      {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mb-1">{p.price}</div>
                  <p className="text-[11px] text-slate-500 mb-4">{p.desc}</p>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-white/60">
                  <span
                    className={`block text-center py-2 rounded-xl text-xs font-bold ${
                      isSelected ? "skeu-button text-white" : "skeu-button-secondary text-slate-700"
                    }`}
                  >
                    {isSelected ? "Paket Terpilih" : "Pilih Paket Ini"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between max-w-xl mx-auto">
          <button
            onClick={() => router.push("/onboarding/step-1")}
            className="skeu-button-secondary px-5 py-2.5 rounded-xl text-xs font-semibold"
          >
            ← Kembali
          </button>
          <button
            onClick={handleNext}
            className="skeu-button px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md"
          >
            <span>Lanjut ke Penentuan Subdomain</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}


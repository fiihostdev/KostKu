"use client";

import { useState, useEffect, useCallback } from "react";
import { useKost } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

interface Plan {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  maxKamar: number;
  maxCabang: number;
  features: string[];
  canDowngradeTo: boolean;
  downgradeBlocked: boolean;
}

interface SubInfo {
  currentPlan: string;
  expiresAt: string | null;
  currentRooms: number;
  activeBranches: number;
  plans: Plan[];
}

const PLAN_COLORS: Record<string, string> = {
  starter:    "border-slate-300 bg-slate-50",
  pro:        "border-primary/40 bg-primary/5",
  enterprise: "border-amber-400/40 bg-amber-50/50",
};

const PLAN_LABEL_COLORS: Record<string, string> = {
  starter:    "bg-slate-100 text-slate-800",
  pro:        "bg-primary/10 text-primary",
  enterprise: "bg-amber-100 text-amber-800",
};

export default function PaketManager() {
  const { profile } = useKost();
  const toast = useToast();

  const [info,         setInfo]         = useState<SubInfo | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [processing,   setProcessing]   = useState<string | null>(null); // plan id being processed
  const [confirmPlan,  setConfirmPlan]  = useState<Plan | null>(null);   // downgrade confirm modal
  const [showAll,      setShowAll]      = useState(false);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/upgrade", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setInfo(data);
    } catch {
      toast.error("Gagal memuat info paket", "Periksa koneksi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const handleChangePlan = async (planId: string, confirmedDowngrade = false) => {
    setProcessing(planId);
    try {
      const res = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlan: planId, confirmedDowngrade }),
      });
      const data = await res.json();

      if (res.status === 428) {
        // Needs confirmation
        const plan = info?.plans.find((p) => p.id === planId);
        if (plan) setConfirmPlan(plan);
        return;
      }

      if (!res.ok) {
        toast.error("Gagal mengubah paket", data.error || "Coba lagi.");
        return;
      }

      toast.success(
        data.type === "upgrade" ? "🎉 Upgrade Berhasil!" : "Paket berhasil diubah",
        data.message
      );
      setConfirmPlan(null);
      await fetchInfo();
      // Refresh plan limits in the UI
      window.location.reload();
    } catch {
      toast.error("Gagal", "Periksa koneksi.");
    } finally {
      setProcessing(null);
    }
  };

  // Remaining days calculation
  const getDaysLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now  = new Date();
    const exp  = new Date(expiresAt);
    const diff = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="skeu-card p-6 rounded-2xl space-y-4 animate-pulse">
        <div className="skeleton h-5 w-48 rounded-lg"></div>
        <div className="skeleton h-20 w-full rounded-xl"></div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-40 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  if (!info) return null;

  const daysLeft = getDaysLeft(info.expiresAt);
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;

  const currentPlanObj = info.plans.find((p) => p.id === info.currentPlan);

  return (
    <div className="space-y-5">
      {/* ── Downgrade Confirm Modal ── */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="skeu-card p-6 rounded-2xl max-w-md w-full shadow-2xl text-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/60">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-amber-600 text-[22px]">warning</span>
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Konfirmasi Downgrade</h3>
                <p className="text-slate-500 text-[11px]">ke {confirmPlan.name}</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-2">
              <p className="font-bold">Fitur yang akan hilang:</p>
              <ul className="space-y-1 text-[11px]">
                {info.currentPlan === "enterprise" && confirmPlan.id === "pro" && (
                  <>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[13px]">cancel</span> Multi-User Admin</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[13px]">cancel</span> Domain Kustom</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[13px]">cancel</span> Cabang lebih dari 3</li>
                  </>
                )}
                {confirmPlan.id === "starter" && (
                  <>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[13px]">cancel</span> WhatsApp Tagihan Otomatis</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[13px]">cancel</span> Payment Gateway</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[13px]">cancel</span> QRIS Dinamis</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[13px]">cancel</span> Multi-Cabang</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[13px]">cancel</span> Ekspor CSV/Laporan</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[13px]">cancel</span> Upload Foto Kamar</li>
                  </>
                )}
              </ul>
              <p className="text-[11px] font-bold border-t border-amber-300 pt-2 mt-2">
                Downgrade berlaku mulai saat ini. Masa aktif diperpanjang 30 hari dengan harga baru.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmPlan(null)} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">Batal</button>
              <button
                onClick={() => handleChangePlan(confirmPlan.id, true)}
                disabled={!!processing}
                className="px-5 py-2 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md disabled:opacity-70 flex items-center gap-1.5"
              >
                {processing === confirmPlan.id
                  ? <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Memproses...</>
                  : "Ya, Downgrade Sekarang"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Current Plan Status ── */}
      <div className={`p-4 rounded-2xl border-2 ${PLAN_COLORS[info.currentPlan] || PLAN_COLORS.starter}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${PLAN_LABEL_COLORS[info.currentPlan]}`}>
                {currentPlanObj?.name || info.currentPlan}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Aktif
              </span>
            </div>
            <p className="text-xs text-slate-700 font-semibold mt-1">
              {currentPlanObj?.maxKamar === 999999 ? "Kamar & Properti Tanpa Batas" : `Hingga ${currentPlanObj?.maxKamar} Kamar`}
              {" · "}
              {currentPlanObj?.maxCabang === 99 ? "Cabang Tak Terbatas" : `${currentPlanObj?.maxCabang} Cabang`}
            </p>
          </div>

          {/* Masa aktif */}
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Masa Aktif</p>
            {info.expiresAt ? (
              <div>
                <p className={`text-sm font-black ${isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-slate-900"}`}>
                  {isExpired ? "Kadaluarsa" : `${daysLeft} hari lagi`}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {new Date(info.expiresAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            ) : (
              <p className="text-sm font-black text-slate-400">—</p>
            )}
          </div>
        </div>

        {/* Expiry warning */}
        {isExpired && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            Paket kadaluarsa! Perpanjang sekarang untuk memulihkan akses fitur.
          </div>
        )}
        {isExpiringSoon && !isExpired && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[11px] font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            Paket akan kadaluarsa dalam {daysLeft} hari. Perpanjang untuk menjaga kontinuitas layanan.
          </div>
        )}
      </div>

      {/* ── Plan Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pilih atau Ubah Paket</p>
          <button onClick={() => setShowAll(!showAll)} className="text-[11px] font-bold text-primary hover:underline">
            {showAll ? "Sembunyikan detail" : "Lihat perbandingan lengkap"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {info.plans.map((plan) => {
            const isCurrent = plan.id === info.currentPlan;
            const isUpgrade = !isCurrent && (
              (info.currentPlan === "starter" && (plan.id === "pro" || plan.id === "enterprise")) ||
              (info.currentPlan === "pro" && plan.id === "enterprise")
            );
            const isDowngrade = !isCurrent && !isUpgrade;
            const canChange = !isCurrent && (isUpgrade || plan.canDowngradeTo);
            const isLoading = processing === plan.id;

            return (
              <div
                key={plan.id}
                className={`skeu-card p-4 rounded-2xl flex flex-col justify-between border-2 transition-all ${
                  isCurrent
                    ? `${PLAN_COLORS[plan.id]} ring-2 ring-offset-1 ring-primary/40`
                    : "border-transparent hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${PLAN_LABEL_COLORS[plan.id]}`}>
                        {plan.name}
                      </span>
                      {isCurrent && (
                        <span className="ml-1.5 text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">AKTIF</span>
                      )}
                    </div>
                    {plan.id === "pro" && !isCurrent && (
                      <span className="text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded-full">POPULER</span>
                    )}
                  </div>

                  <p className="text-lg font-black text-slate-900 mb-0.5">{plan.priceLabel}</p>

                  {showAll && (
                    <ul className="space-y-1 mt-2 mb-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                          <span className="material-symbols-outlined text-emerald-600 text-[13px] shrink-0">check_circle</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-3">
                  {isCurrent ? (
                    <div className="text-center py-2 text-[11px] font-bold text-slate-500">
                      ✓ Paket Aktif Anda
                    </div>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleChangePlan(plan.id)}
                      disabled={!!processing}
                      className="skeu-button w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-70"
                    >
                      {isLoading
                        ? <><span className="material-symbols-outlined text-[14px] animate-spin">sync</span> Memproses...</>
                        : <><span className="material-symbols-outlined text-[14px]">upgrade</span> Upgrade ke {plan.name.replace("Paket ", "")}</>
                      }
                    </button>
                  ) : plan.downgradeBlocked ? (
                    <div className="text-center py-1.5 text-[10px] text-slate-400 font-semibold">
                      ⚠ Kurangi kamar/cabang dulu
                    </div>
                  ) : canChange ? (
                    <button
                      onClick={() => handleChangePlan(plan.id)}
                      disabled={!!processing}
                      className="skeu-button-secondary w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-amber-700 disabled:opacity-70"
                    >
                      {isLoading
                        ? <><span className="material-symbols-outlined text-[14px] animate-spin">sync</span> Memproses...</>
                        : <><span className="material-symbols-outlined text-[14px]">south</span> Downgrade</>
                      }
                    </button>
                  ) : (
                    <div className="text-center py-1.5 text-[10px] text-slate-400 font-semibold">
                      Tidak tersedia
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Info box ── */}
      <div className="skeu-card p-4 rounded-xl flex items-start gap-3 text-xs text-slate-600">
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0">info</span>
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold text-slate-800">Ketentuan Upgrade & Downgrade</p>
          <p><strong className="text-emerald-700">Upgrade</strong> — Berlaku langsung. Masa aktif diperpanjang 30 hari.</p>
          <p><strong className="text-amber-700">Downgrade</strong> — Hanya bisa jika jumlah kamar & cabang sesuai batas paket tujuan. Fitur Premium akan nonaktif.</p>
          <p>Pembayaran akan diarahkan ke Midtrans (QRIS/VA) pada versi mendatang. Saat ini perubahan paket diproses langsung.</p>
        </div>
      </div>
    </div>
  );
}

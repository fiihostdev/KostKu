"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";
import MidtransModal from "@/components/payment/MidtransModal";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "manajementkost.my.id";

const PLAN_PRICES: Record<string, number> = {
  starter:    99000,
  pro:        199000,
  enterprise: 399000,
};

const PLAN_LABELS: Record<string, string> = {
  starter:    "Paket Starter",
  pro:        "Paket Pro",
  enterprise: "Paket Enterprise",
};

interface PlatformPayConfig {
  midtrans_enabled:       string;
  midtrans_client_key:    string;
  midtrans_is_production: string;
  qris_enabled:           string;
  qris_image_url:         string;
  qris_account_name:      string;
  qris_bank_name:         string;
  transfer_enabled:       string;
  transfer_bank_name:     string;
  transfer_no_rekening:   string;
  transfer_account_name:  string;
  transfer_instructions:  string;
}

type PayMethod = "midtrans" | "qris" | "transfer";

function Step4Content() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const subdomain    = searchParams?.get("subdomain") || "kostsaya";
  const plan         = searchParams?.get("plan")       || "pro";
  const namaKost     = searchParams?.get("nama")       || "Kost Saya";

  const planPrice = PLAN_PRICES[plan] || 199000;
  const planLabel = PLAN_LABELS[plan] || "Paket Pro";

  // Platform payment config from superadmin
  const [payConfig,       setPayConfig]       = useState<PlatformPayConfig | null>(null);
  const [configLoading,   setConfigLoading]   = useState(true);
  const [selectedMethod,  setSelectedMethod]  = useState<PayMethod | null>(null);

  // Modal / flow states
  const [showMidtrans,    setShowMidtrans]    = useState(false);
  const [isCreating,      setIsCreating]      = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  // Transfer confirm state
  const [transferDone,    setTransferDone]    = useState(false);
  const [transferConfirm, setTransferConfirm] = useState(false);

  // Load platform payment config
  useEffect(() => {
    setConfigLoading(true);
    fetch("/api/superadmin/platform-payment")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.config) {
          setPayConfig(d.config as PlatformPayConfig);
          // Auto-select first available method
          const cfg = d.config as PlatformPayConfig;
          if (cfg.midtrans_enabled === "true")       setSelectedMethod("midtrans");
          else if (cfg.qris_enabled === "true")      setSelectedMethod("qris");
          else if (cfg.transfer_enabled !== "false") setSelectedMethod("transfer");
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);

  // Activate account after payment
  const activateAccount = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/create-profile", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          namaKost,
          subdomain,
          tagline: "Hunian nyaman, bersih, dan strategis",
          telepon: "",
          alamat:  "",
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Gagal membuat profil kost. Coba lagi.");
        setIsCreating(false);
        return;
      }
      // Upgrade paket jika bukan starter
      if (plan !== "starter") {
        const upgradeRes = await fetch("/api/onboarding/activate-plan", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ plan }),
        });
        if (!upgradeRes.ok) console.warn("[onboarding] Plan upgrade failed, started as starter");
      }
      router.push("/admin/dashboard");
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsCreating(false);
    }
  };

  const handleMidtransSuccess = async () => {
    setShowMidtrans(false);
    await activateAccount();
  };

  const handleTransferConfirm = async () => {
    setTransferConfirm(true);
    await activateAccount();
  };

  // Available methods
  const methods = payConfig ? [
    payConfig.midtrans_enabled === "true" && "midtrans",
    payConfig.qris_enabled     === "true" && "qris",
    payConfig.transfer_enabled !== "false" && "transfer",
  ].filter(Boolean) as PayMethod[] : [];

  if (isCreating) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 font-sans">
        <div className="skeu-card p-8 rounded-2xl text-center space-y-4 max-w-sm w-full mx-4">
          <span className="material-symbols-outlined text-primary text-[48px] animate-spin block">sync</span>
          <h2 className="font-black text-slate-900 text-lg">Mengaktifkan Akun...</h2>
          <p className="text-xs text-slate-500">
            Menyiapkan dashboard dan subdomain <strong>{subdomain}.{APP_DOMAIN}</strong> untuk Anda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8 md:p-12 font-sans">
      <OnboardingStepper currentStep={4} />

      {/* Midtrans Modal */}
      {selectedMethod === "midtrans" && (
        <MidtransModal
          isOpen={showMidtrans}
          grossAmount={planPrice}
          orderId={`ONBOARD-${subdomain}-${Date.now().toString().slice(-6)}`}
          itemName={`${planLabel} KOSTKU`}
          customerName={namaKost}
          onClose={() => setShowMidtrans(false)}
          onSuccess={handleMidtransSuccess}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header card */}
        <div className="skeu-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl">
          <div className="mb-6 pb-4 border-b border-white/60">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider">
              Langkah Terakhir
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Pembayaran & Aktivasi Akun
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Selesaikan pembayaran untuk mengaktifkan subdomain dan dashboard Anda.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Order Summary */}
          <div className="skeu-inset p-4 rounded-xl mb-5 space-y-2 text-xs">
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
              <span className="font-mono font-bold text-primary">{subdomain}.{APP_DOMAIN}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Biaya Setup & SSL:</span>
              <span className="font-bold text-emerald-600">GRATIS</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
              <span>Total Pembayaran:</span>
              <span className="text-primary text-base font-black">
                Rp {planPrice.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          {configLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-6 justify-center">
              <span className="material-symbols-outlined text-primary text-[20px] animate-spin">sync</span>
              Memuat metode pembayaran...
            </div>
          ) : methods.length === 0 ? (
            /* Tidak ada metode aktif — fallback ke Midtrans */
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-amber-600">info</span>
                Hubungi admin platform untuk instruksi pembayaran manual.
              </div>
              <button
                onClick={() => setShowMidtrans(true)}
                className="skeu-button w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">credit_card</span>
                Bayar via Midtrans
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Method selector */}
              {methods.length > 1 && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Pilih Metode Pembayaran:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {methods.map((m) => {
                      const labels: Record<PayMethod, { icon: string; label: string; sub: string }> = {
                        midtrans: { icon: "credit_card",    label: "Midtrans",        sub: "QRIS, VA, GoPay, OVO" },
                        qris:     { icon: "qr_code_2",     label: "QRIS",             sub: payConfig?.qris_account_name || "Scan QR" },
                        transfer: { icon: "account_balance", label: "Transfer Bank",  sub: payConfig?.transfer_bank_name || "Transfer Manual" },
                      };
                      const info = labels[m];
                      return (
                        <button
                          key={m}
                          onClick={() => setSelectedMethod(m)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            selectedMethod === m
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-transparent skeu-card hover:border-primary/30"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[22px] block mb-1 ${selectedMethod === m ? "text-primary" : "text-slate-400"}`}>
                            {info.icon}
                          </span>
                          <p className="font-bold text-slate-900 text-xs">{info.label}</p>
                          <p className="text-[10px] text-slate-500 truncate">{info.sub}</p>
                          {selectedMethod === m && (
                            <span className="material-symbols-outlined text-primary text-[14px] float-right -mt-1">check_circle</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── MIDTRANS ── */}
              {selectedMethod === "midtrans" && (
                <div className="space-y-3">
                  <div className="skeu-card p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-[28px]">payments</span>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">Midtrans Snap Payment Gateway</p>
                        <p className="text-[11px] text-slate-500">QRIS, GoPay, OVO, ShopeePay, BCA VA, Mandiri VA, BNI VA, Kartu Kredit</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMidtrans(true)}
                    className="skeu-button w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[16px]">credit_card</span>
                    Bayar Sekarang — Rp {planPrice.toLocaleString("id-ID")}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              )}

              {/* ── QRIS STATIS ── */}
              {selectedMethod === "qris" && payConfig && (
                <div className="space-y-3">
                  <div className="skeu-card p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-white/60">
                      <span className="material-symbols-outlined text-emerald-600 text-[24px]">qr_code_2</span>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Bayar via QRIS</p>
                        <p className="text-[11px] text-slate-500">
                          {payConfig.qris_account_name && `a.n. ${payConfig.qris_account_name}`}
                          {payConfig.qris_bank_name && ` · ${payConfig.qris_bank_name}`}
                        </p>
                      </div>
                    </div>

                    {/* QR Image */}
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="shrink-0">
                        {payConfig.qris_image_url ? (
                          <div className="p-3 bg-white rounded-2xl border-2 border-emerald-200 shadow-sm">
                            <img
                              src={payConfig.qris_image_url}
                              alt="QRIS Platform"
                              className="w-44 h-44 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-44 h-44 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                            <span className="material-symbols-outlined text-slate-300 text-[48px]">qr_code</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs space-y-2.5 flex-1">
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Nominal:</span>
                            <span className="font-black text-primary">Rp {planPrice.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Paket:</span>
                            <span className="font-bold text-slate-900">{planLabel}</span>
                          </div>
                          {payConfig.qris_account_name && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Penerima:</span>
                              <span className="font-bold text-slate-900">{payConfig.qris_account_name}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                          <span className="material-symbols-outlined text-[14px] text-amber-600 shrink-0 mt-0.5">info</span>
                          <span>Scan QR dengan app GoPay, DANA, OVO, atau mobile banking manapun yang mendukung QRIS.</span>
                        </div>
                      </div>
                    </div>

                    {/* Konfirmasi sudah bayar */}
                    <div className="pt-3 border-t border-white/60 space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={transferDone}
                          onChange={(e) => setTransferDone(e.target.checked)}
                          className="rounded text-primary w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs text-slate-700 font-semibold">
                          Saya sudah scan dan menyelesaikan pembayaran <span className="font-black text-primary">Rp {planPrice.toLocaleString("id-ID")}</span>
                        </span>
                      </label>
                      <button
                        onClick={handleTransferConfirm}
                        disabled={!transferDone || transferConfirm}
                        className="skeu-button w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${transferConfirm ? "animate-spin" : ""}`}>
                          {transferConfirm ? "sync" : "check_circle"}
                        </span>
                        {transferConfirm ? "Memproses..." : "Konfirmasi & Aktifkan Akun"}
                      </button>
                      <p className="text-[10px] text-slate-500 text-center">
                        Admin akan memverifikasi pembayaran Anda. Akun aktif setelah konfirmasi.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TRANSFER BANK ── */}
              {selectedMethod === "transfer" && payConfig && (
                <div className="space-y-3">
                  <div className="skeu-card p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-white/60">
                      <span className="material-symbols-outlined text-slate-600 text-[24px]">account_balance</span>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Transfer Bank Manual</p>
                        <p className="text-[11px] text-slate-500">Admin konfirmasi setelah transfer diterima</p>
                      </div>
                    </div>

                    {/* Detail rekening */}
                    <div className="skeu-inset p-4 rounded-xl space-y-3 text-xs">
                      {payConfig.transfer_bank_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Bank</span>
                          <span className="font-black text-slate-900 text-sm">{payConfig.transfer_bank_name}</span>
                        </div>
                      )}
                      {payConfig.transfer_no_rekening && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">No. Rekening</span>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 font-mono text-sm">{payConfig.transfer_no_rekening}</span>
                            <button
                              onClick={() => { navigator.clipboard?.writeText(payConfig.transfer_no_rekening); }}
                              className="text-primary hover:text-primary/70"
                              title="Salin"
                            >
                              <span className="material-symbols-outlined text-[16px]">content_copy</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {payConfig.transfer_account_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Atas Nama</span>
                          <span className="font-bold text-slate-900">{payConfig.transfer_account_name}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-white/60 flex items-center justify-between">
                        <span className="text-slate-500">Jumlah Transfer</span>
                        <span className="font-black text-primary text-base">Rp {planPrice.toLocaleString("id-ID")}</span>
                      </div>
                    </div>

                    {/* Instruksi khusus */}
                    {payConfig.transfer_instructions && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 leading-relaxed">
                        <p className="font-bold mb-1">Instruksi Transfer:</p>
                        <p>{payConfig.transfer_instructions}</p>
                      </div>
                    )}

                    {/* Konfirmasi */}
                    <div className="pt-3 border-t border-white/60 space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={transferDone}
                          onChange={(e) => setTransferDone(e.target.checked)}
                          className="rounded text-primary w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs text-slate-700 font-semibold">
                          Saya sudah transfer <span className="font-black text-primary">Rp {planPrice.toLocaleString("id-ID")}</span> ke rekening di atas
                        </span>
                      </label>
                      <button
                        onClick={handleTransferConfirm}
                        disabled={!transferDone || transferConfirm}
                        className="skeu-button w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${transferConfirm ? "animate-spin" : ""}`}>
                          {transferConfirm ? "sync" : "check_circle"}
                        </span>
                        {transferConfirm ? "Memproses..." : "Konfirmasi Sudah Transfer"}
                      </button>
                      <p className="text-[10px] text-slate-500 text-center">
                        Akun Anda akan diaktifkan setelah pembayaran terverifikasi (1×24 jam).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Back button */}
          <div className="pt-4 border-t border-white/60 mt-4">
            <button
              type="button"
              onClick={() => router.push("/onboarding/step-3")}
              className="skeu-button-secondary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Kembali ke Langkah Sebelumnya
            </button>
          </div>
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

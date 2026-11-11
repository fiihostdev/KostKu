"use client";

import { useState, useEffect, useCallback } from "react";
import { useKost } from "@/lib/store";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoiceId: string) => void;
  invoiceId: string;
  invoiceNo: string;
  penyewa: string;
  kamar: string;
  nominal: number;
}

type PayMethod = "qris" | "midtrans" | "tripay" | "xendit";

interface GatewayStatus {
  hasQris: boolean;
  midtransActive: boolean;
  tripayActive: boolean;
  xenditActive: boolean;
}

export default function PaymentModal({
  isOpen, onClose, onSuccess,
  invoiceId, invoiceNo, penyewa, kamar, nominal,
}: PaymentModalProps) {
  const { kostId } = useKost();
  const [method,       setMethod]       = useState<PayMethod | null>(null);
  const [gateway,      setGateway]      = useState<GatewayStatus>({ hasQris: false, midtransActive: false, tripayActive: false, xenditActive: false });
  const [loadingGw,    setLoadingGw]    = useState(false);

  // QRIS state
  const [qrSrc,        setQrSrc]        = useState<string | null>(null);
  const [loadingQr,    setLoadingQr]    = useState(false);

  // Payment gateway state
  const [loadingPay,   setLoadingPay]   = useState(false);
  const [payUrl,       setPayUrl]       = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  // Manual confirm (untuk QRIS)
  const [confirming,   setConfirming]   = useState(false);
  const [confirmed,    setConfirmed]    = useState(false);

  // Load available payment methods
  const loadGateways = useCallback(async () => {
    if (!kostId) return;
    setLoadingGw(true);
    try {
      // Check QRIS
      const qrisRes = await fetch(`/api/qris/generate?kostId=${kostId}&amount=${nominal}`, {
        method: "HEAD",
        cache: "no-store",
      }).catch(() => ({ ok: false, status: 0 }));

      // Check payment configs
      const cfgRes = await fetch("/api/payment/config");
      const cfgData = cfgRes.ok ? await cfgRes.json() : { configs: [] };
      const cfgs = (cfgData.configs || []) as Array<{ provider: string; is_active: boolean }>;

      setGateway({
        hasQris:        qrisRes.ok || qrisRes.status === 200,
        midtransActive: cfgs.some(c => c.provider === "midtrans" && c.is_active),
        tripayActive:   cfgs.some(c => c.provider === "tripay"   && c.is_active),
        xenditActive:   cfgs.some(c => c.provider === "xendit"   && c.is_active),
      });
    } catch {
      // silent
    } finally {
      setLoadingGw(false);
    }
  }, [kostId, nominal]);

  useEffect(() => {
    if (isOpen) {
      setMethod(null);
      setQrSrc(null);
      setPayUrl(null);
      setError(null);
      setConfirmed(false);
      loadGateways();
    }
  }, [isOpen, loadGateways]);

  // Load QR saat method = qris
  useEffect(() => {
    if (method === "qris" && kostId && !qrSrc) {
      setLoadingQr(true);
      fetch(`/api/qris/generate?kostId=${kostId}&amount=${nominal}`, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) throw new Error("Gagal load QR");
          const blob = await res.blob();
          const url  = URL.createObjectURL(blob);
          setQrSrc((prev) => { if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev); return url; });
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoadingQr(false));
    }
  }, [method, kostId, nominal, qrSrc]);

  // Trigger payment gateway
  const handleGatewayPay = async (provider: "midtrans" | "tripay" | "xendit") => {
    if (!kostId) return;
    setLoadingPay(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kostId,
          invoiceId,
          provider,
          customerName:  penyewa,
          customerEmail: "",
          customerPhone: "",
          kamar,
          nominal,
          description: `Sewa ${kamar} - ${penyewa}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Gagal membuat transaksi");
        return;
      }
      if (data.token && provider === "midtrans") {
        // Midtrans Snap
        setPayUrl(data.redirectUrl);
        window.open(data.redirectUrl, "_blank");
      } else if (data.redirectUrl) {
        setPayUrl(data.redirectUrl);
        window.open(data.redirectUrl, "_blank");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingPay(false);
    }
  };

  // Konfirmasi pembayaran QRIS manual
  const handleConfirmQris = async () => {
    setConfirming(true);
    try {
      // Update invoice ke Lunas via store
      onSuccess(invoiceId);
      setConfirmed(true);
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  const hasAnyMethod = gateway.hasQris || gateway.midtransActive || gateway.tripayActive || gateway.xenditActive;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-indigo-700 p-4 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-sm">Pembayaran Tagihan</p>
              <p className="text-[11px] text-white/80">{invoiceNo} · {penyewa} · {kamar}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-white/70 font-bold uppercase">Total Tagihan</span>
            <span className="text-2xl font-black">Rp {nominal.toLocaleString("id-ID")}</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">

          {/* Sukses */}
          {confirmed ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-emerald-600 text-[40px]">check_circle</span>
              </div>
              <p className="font-black text-lg text-slate-900">Pembayaran Dikonfirmasi!</p>
              <p className="text-slate-500">Invoice {invoiceNo} telah ditandai Lunas.</p>
              <button onClick={onClose} className="skeu-button px-6 py-2.5 rounded-xl font-bold text-sm shadow-md">
                Selesai
              </button>
            </div>
          ) : payUrl ? (
            /* Redirect sudah dibuka */
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-blue-600 text-[32px]">open_in_new</span>
              </div>
              <p className="font-bold text-slate-800">Halaman pembayaran sudah dibuka</p>
              <p className="text-[11px] text-slate-500">Selesaikan pembayaran di tab baru. Status akan update otomatis via webhook.</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => window.open(payUrl, "_blank")} className="skeu-button-secondary px-4 py-2 rounded-xl font-bold">
                  Buka Ulang
                </button>
                <button onClick={onClose} className="skeu-button px-4 py-2 rounded-xl font-bold">
                  Tutup
                </button>
              </div>
            </div>
          ) : method === null ? (
            /* Pilih metode */
            <>
              <p className="font-bold text-slate-700 text-sm">Pilih Metode Pembayaran</p>

              {loadingGw ? (
                <div className="flex items-center gap-2 py-4 justify-center text-slate-500">
                  <span className="material-symbols-outlined text-[20px] animate-spin text-primary">sync</span>
                  Memuat metode pembayaran...
                </div>
              ) : !hasAnyMethod ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                  <span className="material-symbols-outlined text-amber-500 text-[28px] block mb-1">warning</span>
                  <p className="font-bold text-amber-800 text-xs">Belum ada metode pembayaran aktif</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">Aktifkan QRIS atau payment gateway di menu Pengaturan.</p>
                </div>
              ) : (
                <div className="space-y-2">

                  {/* QRIS */}
                  {gateway.hasQris && (
                    <button
                      onClick={() => setMethod("qris")}
                      className="w-full p-4 rounded-2xl skeu-card text-left flex items-center gap-4 hover:border-primary/30 hover:bg-primary/3 transition-all"
                    >
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[24px]">qr_code_2</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">QRIS</p>
                        <p className="text-[11px] text-slate-500">GoPay, DANA, OVO, m-Banking, semua dompet digital</p>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Instant</span>
                    </button>
                  )}

                  {/* Midtrans */}
                  {gateway.midtransActive && (
                    <button
                      onClick={() => { setMethod("midtrans"); handleGatewayPay("midtrans"); }}
                      disabled={loadingPay}
                      className="w-full p-4 rounded-2xl skeu-card text-left flex items-center gap-4 hover:border-primary/30 hover:bg-primary/3 transition-all disabled:opacity-60"
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-blue-600 text-[24px]">payments</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">Midtrans</p>
                        <p className="text-[11px] text-slate-500">Virtual Account BCA/Mandiri/BNI/BRI, GoPay, Kartu Kredit</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                    </button>
                  )}

                  {/* Tripay */}
                  {gateway.tripayActive && (
                    <button
                      onClick={() => { setMethod("tripay"); handleGatewayPay("tripay"); }}
                      disabled={loadingPay}
                      className="w-full p-4 rounded-2xl skeu-card text-left flex items-center gap-4 hover:border-primary/30 hover:bg-primary/3 transition-all disabled:opacity-60"
                    >
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-emerald-600 text-[24px]">account_balance</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">Tripay</p>
                        <p className="text-[11px] text-slate-500">QRIS, Transfer Bank, Minimarket</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                    </button>
                  )}

                  {/* Xendit */}
                  {gateway.xenditActive && (
                    <button
                      onClick={() => { setMethod("xendit"); handleGatewayPay("xendit"); }}
                      disabled={loadingPay}
                      className="w-full p-4 rounded-2xl skeu-card text-left flex items-center gap-4 hover:border-primary/30 hover:bg-primary/3 transition-all disabled:opacity-60"
                    >
                      <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-violet-600 text-[24px]">credit_score</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">Xendit</p>
                        <p className="text-[11px] text-slate-500">Virtual Account, E-Wallet, Kartu</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {error}
                </div>
              )}
            </>

          ) : method === "qris" ? (
            /* QRIS Payment */
            <div className="space-y-4">
              <button onClick={() => { setMethod(null); setQrSrc(null); }} className="text-[11px] text-primary font-bold flex items-center gap-1 hover:underline">
                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                Pilih metode lain
              </button>

              <div className="text-center space-y-3">
                <p className="font-bold text-slate-800">Scan QR dengan e-wallet apapun</p>
                <p className="text-[11px] text-slate-500">Nominal sudah otomatis ter-isi: <strong>Rp {nominal.toLocaleString("id-ID")}</strong></p>

                <div className="flex justify-center">
                  {loadingQr ? (
                    <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200">
                      <span className="material-symbols-outlined text-primary text-[36px] animate-spin">sync</span>
                      <p className="text-[11px] text-slate-500">Generating QR...</p>
                    </div>
                  ) : qrSrc ? (
                    <div className="p-3 bg-white border-2 border-primary/20 rounded-2xl shadow-sm inline-block">
                      <img src={qrSrc} alt="QRIS" className="w-52 h-52 object-contain" style={{ imageRendering: "pixelated" }} />
                    </div>
                  ) : (
                    <div className="w-56 py-6 text-center text-red-600 text-xs font-bold">{error || "Gagal load QR"}</div>
                  )}
                </div>

                {/* Instruksi */}
                <div className="text-left space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {["Buka GoPay / DANA / OVO / m-Banking", "Pilih Scan QR atau QRIS", "Scan QR di atas — nominal sudah terisi", "Konfirmasi bayar → selesai"].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                      <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">{i + 1}</span>
                      {s}
                    </div>
                  ))}
                </div>

                {/* Konfirmasi manual setelah bayar */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-[11px] text-slate-500">Setelah transfer berhasil, klik tombol di bawah untuk konfirmasi.</p>
                  <button
                    onClick={handleConfirmQris}
                    disabled={confirming}
                    className="w-full skeu-button py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${confirming ? "animate-spin" : ""}`}>
                      {confirming ? "sync" : "check_circle"}
                    </span>
                    {confirming ? "Memproses..." : "Saya Sudah Bayar"}
                  </button>
                </div>
              </div>
            </div>

          ) : (
            /* Loading gateway */
            <div className="flex flex-col items-center gap-3 py-8">
              <span className="material-symbols-outlined text-primary text-[40px] animate-spin">sync</span>
              <p className="font-bold text-slate-700">Membuat transaksi...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

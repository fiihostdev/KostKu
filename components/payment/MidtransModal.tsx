"use client";

import { useState, useEffect, useRef } from "react";

interface MidtransModalProps {
  isOpen:        boolean;
  onClose:       () => void;
  onSuccess:     () => void;
  orderId:       string;
  grossAmount:   number;
  itemName:      string;
  customerName?: string;
  /** Snap token dari server — wajib untuk mode production/sandbox nyata */
  snapToken?:    string;
  /** Client key Midtrans — untuk load Snap.js */
  clientKey?:    string;
  /** true = sandbox, false = production */
  isSandbox?:    boolean;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snap?: { pay: (token: string, options: Record<string, unknown>) => void };
  }
}

/**
 * MidtransModal — integrasi nyata dengan Midtrans Snap JS SDK.
 *
 * Jika snapToken tersedia: load Snap.js dan panggil snap.pay() — real payment.
 * Jika tidak ada snapToken: tampilkan UI sandbox simulasi untuk testing.
 */
export default function MidtransModal({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  grossAmount,
  itemName,
  customerName = "Admin",
  snapToken,
  clientKey,
  isSandbox = true,
}: MidtransModalProps) {
  const [snapLoaded,   setSnapLoaded]   = useState(false);
  const [snapError,    setSnapError]    = useState<string | null>(null);
  const [launched,     setLaunched]     = useState(false);
  const snapScriptRef  = useRef<HTMLScriptElement | null>(null);

  // ── Load Snap.js SDK ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !snapToken || !clientKey) return;

    const snapUrl = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/snap.js"
      : "https://app.midtrans.com/snap/snap.js";

    // Jika sudah loaded sebelumnya
    if (window.snap) { setSnapLoaded(true); return; }

    // Cek apakah script sudah ada di DOM
    const existing = document.querySelector(`script[src="${snapUrl}"]`);
    if (existing) {
      const check = setInterval(() => {
        if (window.snap) { setSnapLoaded(true); clearInterval(check); }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src             = snapUrl;
    script.setAttribute("data-client-key", clientKey);
    script.onload  = () => setSnapLoaded(true);
    script.onerror = () => setSnapError("Gagal load Midtrans Snap. Periksa koneksi.");
    document.head.appendChild(script);
    snapScriptRef.current = script;
  }, [isOpen, snapToken, clientKey, isSandbox]);

  // ── Launch Snap.pay() setelah SDK loaded ────────────────────────────────────
  useEffect(() => {
    if (!snapLoaded || !snapToken || launched) return;
    if (!window.snap) return;

    setLaunched(true);
    window.snap.pay(snapToken, {
      onSuccess:    () => { onSuccess(); },
      onPending:    () => { /* Status akan update via webhook */ },
      onError:      () => { setSnapError("Transaksi gagal. Silakan coba lagi."); },
      onClose:      () => { onClose(); },
    });
  }, [snapLoaded, snapToken, launched, onSuccess, onClose]);

  // Reset saat modal ditutup
  useEffect(() => {
    if (!isOpen) {
      setSnapLoaded(false);
      setSnapError(null);
      setLaunched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Mode 1: Snap SDK — tampilkan overlay loading sementara Snap terbuka ─────
  if (snapToken && clientKey) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-8 text-center space-y-4">
          {snapError ? (
            <>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-red-600 text-[32px]">error</span>
              </div>
              <p className="font-bold text-slate-900">Gagal Memuat Payment</p>
              <p className="text-xs text-slate-500">{snapError}</p>
              <button onClick={onClose} className="skeu-button px-6 py-2.5 rounded-xl font-bold text-sm shadow-md w-full">
                Tutup
              </button>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-primary text-[48px] animate-spin block mx-auto">sync</span>
              <p className="font-bold text-slate-900">Membuka Halaman Pembayaran...</p>
              <p className="text-xs text-slate-500">Midtrans Snap sedang dimuat. Jangan tutup halaman ini.</p>
              <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 mt-2">
                Batalkan
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Mode 2: Fallback simulasi (testing / tidak ada snapToken) ──────────────
  return <MidtransSandboxUI
    isOpen={isOpen}
    onClose={onClose}
    onSuccess={onSuccess}
    orderId={orderId}
    grossAmount={grossAmount}
    itemName={itemName}
    customerName={customerName}
  />;
}

// ── Sandbox simulation UI (untuk testing tanpa credentials nyata) ─────────────
function MidtransSandboxUI({
  isOpen, onClose, onSuccess, orderId, grossAmount, itemName, customerName,
}: Omit<MidtransModalProps, "snapToken" | "clientKey" | "isSandbox">) {
  const [tab,          setTab]          = useState<"qris" | "bca_va" | "mandiri_va">("qris");
  const [timeLeft,     setTimeLeft]     = useState(899);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [vaNumbers]                     = useState(() => ({
    bca_va:     "88090" + Math.floor(10000000 + Math.random() * 90000000).toString(),
    mandiri_va: "70012" + Math.floor(10000000 + Math.random() * 90000000).toString(),
  }));

  useEffect(() => {
    if (!isOpen) { setTimeLeft(899); setTab("qris"); setIsSimulating(false); return; }
    const id = setInterval(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  if (!isOpen) return null;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 text-slate-800 flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-widest uppercase bg-white/20 px-2.5 py-0.5 rounded-md">midtrans</span>
            <span className="text-[11px] text-white/80">Snap Sandbox</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Amount + Timer */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Tagihan</span>
            <span className="text-lg font-black text-slate-900">Rp {grossAmount.toLocaleString("id-ID")}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Selesaikan Dalam</span>
            <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              ⏱ {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 text-xs font-bold bg-slate-100 overflow-x-auto shrink-0">
          {(["qris", "bca_va", "mandiri_va"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 px-3 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${
                tab === t ? "bg-white text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {t === "qris" ? "qr_code_2" : "account_balance"}
              </span>
              {t === "qris" ? "QRIS" : t === "bca_va" ? "BCA VA" : "Mandiri VA"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {tab === "qris" && (
            <div className="text-center space-y-3">
              <p className="font-bold text-slate-700">Scan dengan GoPay, OVO, DANA, m-Banking</p>
              <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-md flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-7xl text-slate-900">qr_code_2</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase mt-1">SANDBOX MODE</span>
              </div>
              <p className="text-[10px] text-slate-500">Order: <code className="font-mono font-bold">{orderId.slice(-12)}</code></p>
            </div>
          )}
          {tab === "bca_va" && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nomor Virtual Account BCA</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-900">{vaNumbers.bca_va}</span>
                  <button onClick={() => handleCopy(vaNumbers.bca_va)} className="text-xs font-bold text-primary hover:underline">
                    {copied ? "Tersalin!" : "Salin"}
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <p>1. Buka BCA Mobile / KlikBCA</p>
                <p>2. Transfer → BCA Virtual Account</p>
                <p>3. Masukkan nomor VA dan konfirmasi</p>
              </div>
            </div>
          )}
          {tab === "mandiri_va" && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Mandiri Bill Payment</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-900">{vaNumbers.mandiri_va}</span>
                  <button onClick={() => handleCopy(vaNumbers.mandiri_va)} className="text-xs font-bold text-primary hover:underline">
                    {copied ? "Tersalin!" : "Salin"}
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <p>1. Buka Livin&apos; by Mandiri</p>
                <p>2. Bayar → Multi Payment → kode 70012</p>
              </div>
            </div>
          )}
          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-200">
            <div className="flex justify-between"><span>Item:</span><span className="font-bold text-slate-800">{itemName}</span></div>
            <div className="flex justify-between mt-1"><span>Customer:</span><span className="font-bold text-slate-800">{customerName}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col gap-2 shrink-0">
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 text-center font-bold">
            ⚠️ SANDBOX MODE — Tidak ada uang nyata. Aktifkan Midtrans Production di Pengaturan.
          </div>
          <button
            onClick={() => { setIsSimulating(true); setTimeout(() => { setIsSimulating(false); onSuccess(); }, 1200); }}
            disabled={isSimulating}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {isSimulating ? (
              <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span>Memverifikasi...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">verified</span>Simulasikan Bayar Sukses (Sandbox)</>
            )}
          </button>
          <button onClick={onClose} className="text-[11px] text-slate-500 hover:text-slate-800 text-center font-bold py-1">
            Batalkan
          </button>
        </div>
      </div>
    </div>
  );
}
